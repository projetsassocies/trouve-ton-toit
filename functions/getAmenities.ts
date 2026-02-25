import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { address } = await req.json();

    if (!address) {
      return Response.json({ error: 'Address is required' }, { status: 400 });
    }

    // 1. Géocodage avec Nominatim (OpenStreetMap)
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'TrouveTonToit/1.0'
      }
    });

    const geocodeData = await geocodeResponse.json();

    if (!geocodeData || geocodeData.length === 0) {
      return Response.json({ error: 'Address not found' }, { status: 404 });
    }

    const { lat, lon } = geocodeData[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // 2. Recherche des commodités via Overpass API (OpenStreetMap)
    const radius = 3000; // 3km pour tout attraper

    const overpassQuery = `
      [out:json][timeout:25];
      (
        // Transports
        node["railway"="subway_entrance"](around:${radius},${latitude},${longitude});
        node["railway"="station"](around:${radius},${latitude},${longitude});
        node["railway"="tram_stop"](around:${radius},${latitude},${longitude});
        node["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        
        // Éducation
        node["amenity"="kindergarten"](around:${radius},${latitude},${longitude});
        way["amenity"="kindergarten"](around:${radius},${latitude},${longitude});
        node["amenity"="school"](around:${radius},${latitude},${longitude});
        way["amenity"="school"](around:${radius},${latitude},${longitude});
        
        // Commerces
        node["shop"="supermarket"](around:${radius},${latitude},${longitude});
        way["shop"="supermarket"](around:${radius},${latitude},${longitude});
        node["shop"="bakery"](around:${radius},${latitude},${longitude});
        node["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
        node["amenity"="marketplace"](around:${radius},${latitude},${longitude});
        node["amenity"="post_office"](around:${radius},${latitude},${longitude});
        node["amenity"="bank"](around:${radius},${latitude},${longitude});
        
        // Santé
        node["amenity"="doctors"](around:${radius},${latitude},${longitude});
        node["amenity"="clinic"](around:${radius},${latitude},${longitude});
        node["amenity"="hospital"](around:${radius},${latitude},${longitude});
        way["amenity"="hospital"](around:${radius},${latitude},${longitude});
        node["amenity"="dentist"](around:${radius},${latitude},${longitude});
        node["healthcare"="laboratory"](around:${radius},${latitude},${longitude});
        
        // Loisirs
        node["leisure"="park"](around:${radius},${latitude},${longitude});
        way["leisure"="park"](around:${radius},${latitude},${longitude});
        node["leisure"="fitness_centre"](around:${radius},${latitude},${longitude});
        node["leisure"="sports_centre"](around:${radius},${latitude},${longitude});
        node["amenity"="cinema"](around:${radius},${latitude},${longitude});
        node["amenity"="library"](around:${radius},${latitude},${longitude});
        
        // Restaurants
        node["amenity"="restaurant"](around:500,${latitude},${longitude});
        
        // Parking
        node["amenity"="parking"](around:${radius},${latitude},${longitude});
        way["amenity"="parking"](around:${radius},${latitude},${longitude});
        node["amenity"="charging_station"](around:${radius},${latitude},${longitude});
      );
      out body;
      >;
      out skel qt;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const overpassData = await overpassResponse.json();

    // Helper: Calculer distance en mètres
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Rayon de la Terre en mètres
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return Math.round(R * c); // Distance en mètres
    };

    // Helper: Temps de marche (80m/min)
    const getWalkingTime = (distanceMeters) => {
      return Math.max(1, Math.round(distanceMeters / 80));
    };

    // 3. Catégoriser et enrichir les commodités
    const rawAmenities = {
      transports: [],
      education: [],
      commerces: [],
      sante: [],
      loisirs: [],
      restaurants: [],
      parking: []
    };

    overpassData.elements.forEach(element => {
      const tags = element.tags || {};
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;

      if (!lat || !lon) return;

      const distance = calculateDistance(latitude, longitude, lat, lon);
      const walkingTime = getWalkingTime(distance);

      const amenity = {
        id: element.id,
        name: tags.name || 'Sans nom',
        lat,
        lon,
        distance,
        walkingTime,
        type: '',
        subtype: '',
        lines: tags['public_transport:lines'] || tags.route_ref || null,
        rating: null
      };

      // TRANSPORTS
      if (tags.railway === 'subway_entrance') {
        amenity.type = 'Métro';
        amenity.subtype = 'metro';
        rawAmenities.transports.push(amenity);
      } else if (tags.railway === 'station') {
        amenity.type = 'Gare';
        amenity.subtype = 'station';
        rawAmenities.transports.push(amenity);
      } else if (tags.railway === 'tram_stop') {
        amenity.type = 'Tramway';
        amenity.subtype = 'tram';
        rawAmenities.transports.push(amenity);
      } else if (tags.highway === 'bus_stop') {
        amenity.type = 'Bus';
        amenity.subtype = 'bus';
        rawAmenities.transports.push(amenity);
      }
      // ÉDUCATION
      else if (tags.amenity === 'kindergarten') {
        amenity.type = 'Maternelle';
        amenity.subtype = 'kindergarten';
        rawAmenities.education.push(amenity);
      } else if (tags.amenity === 'school') {
        const schoolType = tags['school:type'] || tags.name?.toLowerCase() || '';
        if (schoolType.includes('primaire') || schoolType.includes('élémentaire')) {
          amenity.type = 'École primaire';
          amenity.subtype = 'primary';
        } else if (schoolType.includes('collège')) {
          amenity.type = 'Collège';
          amenity.subtype = 'middle';
        } else if (schoolType.includes('lycée')) {
          amenity.type = 'Lycée';
          amenity.subtype = 'high';
        } else {
          amenity.type = 'École';
          amenity.subtype = 'school';
        }
        rawAmenities.education.push(amenity);
      }
      // COMMERCES
      else if (tags.shop === 'supermarket') {
        amenity.type = 'Supermarché';
        rawAmenities.commerces.push(amenity);
      } else if (tags.shop === 'bakery') {
        amenity.type = 'Boulangerie';
        rawAmenities.commerces.push(amenity);
      } else if (tags.amenity === 'pharmacy') {
        amenity.type = 'Pharmacie';
        rawAmenities.commerces.push(amenity);
      } else if (tags.amenity === 'marketplace') {
        amenity.type = 'Marché';
        rawAmenities.commerces.push(amenity);
      } else if (tags.amenity === 'post_office') {
        amenity.type = 'Poste';
        rawAmenities.commerces.push(amenity);
      } else if (tags.amenity === 'bank') {
        amenity.type = 'Banque';
        rawAmenities.commerces.push(amenity);
      }
      // SANTÉ
      else if (tags.amenity === 'doctors' || tags.amenity === 'clinic') {
        amenity.type = 'Cabinet médical';
        rawAmenities.sante.push(amenity);
      } else if (tags.amenity === 'hospital') {
        amenity.type = 'Hôpital';
        amenity.subtype = tags.emergency === 'yes' ? 'emergency' : 'regular';
        rawAmenities.sante.push(amenity);
      } else if (tags.amenity === 'dentist') {
        amenity.type = 'Dentiste';
        rawAmenities.sante.push(amenity);
      } else if (tags.healthcare === 'laboratory') {
        amenity.type = 'Laboratoire';
        rawAmenities.sante.push(amenity);
      }
      // LOISIRS
      else if (tags.leisure === 'park') {
        amenity.type = 'Parc';
        rawAmenities.loisirs.push(amenity);
      } else if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre') {
        amenity.type = 'Salle de sport';
        rawAmenities.loisirs.push(amenity);
      } else if (tags.amenity === 'cinema') {
        amenity.type = 'Cinéma';
        rawAmenities.loisirs.push(amenity);
      } else if (tags.amenity === 'library') {
        amenity.type = 'Bibliothèque';
        rawAmenities.loisirs.push(amenity);
      }
      // RESTAURANTS
      else if (tags.amenity === 'restaurant') {
        amenity.type = 'Restaurant';
        rawAmenities.restaurants.push(amenity);
      }
      // PARKING
      else if (tags.amenity === 'parking') {
        amenity.type = 'Parking';
        rawAmenities.parking.push(amenity);
      } else if (tags.amenity === 'charging_station') {
        amenity.type = 'Borne électrique';
        rawAmenities.parking.push(amenity);
      }
    });

    // 4. Filtrage intelligent
    const amenities = {
      transports: [],
      education: [],
      commerces: [],
      sante: [],
      loisirs: [],
      restaurants: [],
      parking: []
    };

    // TRANSPORTS (max 5)
    const metros = rawAmenities.transports.filter(a => a.subtype === 'metro').sort((a, b) => a.distance - b.distance).slice(0, 2);
    const trams = rawAmenities.transports.filter(a => a.subtype === 'tram' && a.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const buses = rawAmenities.transports.filter(a => a.subtype === 'bus').sort((a, b) => a.distance - b.distance).slice(0, 2);
    amenities.transports = [...metros, ...trams, ...buses].slice(0, 5);

    // ÉDUCATION (max 6)
    const kindergarten = rawAmenities.education.filter(a => a.subtype === 'kindergarten' && a.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const primary = rawAmenities.education.filter(a => a.subtype === 'primary' && a.distance <= 800).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const middle = rawAmenities.education.filter(a => a.subtype === 'middle' && a.distance <= 1500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const high = rawAmenities.education.filter(a => a.subtype === 'high' && a.distance <= 2000).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const otherSchools = rawAmenities.education.filter(a => !['kindergarten', 'primary', 'middle', 'high'].includes(a.subtype) && a.distance <= 800).sort((a, b) => a.distance - b.distance).slice(0, 2);
    amenities.education = [...kindergarten, ...primary, ...middle, ...high, ...otherSchools].slice(0, 6);

    // COMMERCES (max 8)
    const supermarkets = rawAmenities.commerces.filter(a => a.type === 'Supermarché').sort((a, b) => a.distance - b.distance).slice(0, 1);
    const bakeries = rawAmenities.commerces.filter(a => a.type === 'Boulangerie' && a.distance <= 300).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const pharmacies = rawAmenities.commerces.filter(a => a.type === 'Pharmacie' && a.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const markets = rawAmenities.commerces.filter(a => a.type === 'Marché' && a.distance <= 800).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const postOffices = rawAmenities.commerces.filter(a => a.type === 'Poste' && a.distance <= 600).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const banks = rawAmenities.commerces.filter(a => a.type === 'Banque' && a.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    amenities.commerces = [...supermarkets, ...bakeries, ...pharmacies, ...markets, ...postOffices, ...banks].slice(0, 8);

    // SANTÉ (max 5)
    const doctors = rawAmenities.sante.filter(a => a.type === 'Cabinet médical').sort((a, b) => a.distance - b.distance).slice(0, 1);
    const hospitals = rawAmenities.sante.filter(a => a.type === 'Hôpital' && a.subtype === 'emergency' && a.distance <= 3000).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const dentists = rawAmenities.sante.filter(a => a.type === 'Dentiste' && a.distance <= 500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const labs = rawAmenities.sante.filter(a => a.type === 'Laboratoire' && a.distance <= 600).sort((a, b) => a.distance - b.distance).slice(0, 1);
    amenities.sante = [...doctors, ...hospitals, ...dentists, ...labs].slice(0, 5);

    // LOISIRS (max 5)
    const parks = rawAmenities.loisirs.filter(a => a.type === 'Parc' && a.distance <= 1000).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const gyms = rawAmenities.loisirs.filter(a => a.type === 'Salle de sport' && a.distance <= 1000).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const cinemas = rawAmenities.loisirs.filter(a => a.type === 'Cinéma' && a.distance <= 1500).sort((a, b) => a.distance - b.distance).slice(0, 1);
    const libraries = rawAmenities.loisirs.filter(a => a.type === 'Bibliothèque' && a.distance <= 800).sort((a, b) => a.distance - b.distance).slice(0, 1);
    amenities.loisirs = [...parks, ...gyms, ...cinemas, ...libraries].slice(0, 5);

    // RESTAURANTS (format spécial)
    const restaurantsCount = rawAmenities.restaurants.length;
    const topRestaurants = rawAmenities.restaurants.sort((a, b) => a.distance - b.distance).slice(0, 3);
    amenities.restaurants = {
      count: restaurantsCount,
      top: topRestaurants
    };

    // PARKING (max 3)
    const publicParkings = rawAmenities.parking.filter(a => a.type === 'Parking').sort((a, b) => a.distance - b.distance).slice(0, 1);
    const chargingStations = rawAmenities.parking.filter(a => a.type === 'Borne électrique' && a.distance <= 300).sort((a, b) => a.distance - b.distance).slice(0, 2);
    amenities.parking = [...publicParkings, ...chargingStations].slice(0, 3);

    return Response.json({
      latitude,
      longitude,
      amenities
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
