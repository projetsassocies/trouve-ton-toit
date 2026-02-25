-- ============================================================
-- TrouveTonToit — Données fictives pour tester la page Analyse
-- ============================================================
--
-- AVANT D'EXÉCUTER :
-- 1. Remplace danye.services@gmail.com par ton email de connexion (ex: jean@agence.fr)
-- 2. Fais Ctrl+H ( recherche/remplacement ) : danye.services@gmail.com → ton-email@exemple.com
-- 3. Exécute dans Supabase Dashboard > SQL Editor > New Query
--
-- ============================================================

-- =====================
-- LEADS FICTIFS
-- =====================
INSERT INTO leads (
  first_name, last_name, email, phone, city,
  budget_min, budget_max, property_type, surface_min, surface_max, rooms_min,
  lead_type, status, categorie, financing_status, delai, notes, created_by
) VALUES
-- Acheteur Lyon 3, cherche T3 70-95m², budget 220-280k — matchera les biens Lyon vente
('Marie', 'Dupont', 'marie.dupont@test.fr', '0612345678', 'Lyon 3',
  220000, 280000, 't3', 70, 95, 3,
  'acheteur', 'nouveau', 'CHAUD', 'valide', '2 mois', 'Quartier Part-Dieu', 'danye.services@gmail.com'),
-- Acheteur Lyon, T2 plus petit budget
('Pierre', 'Martin', 'pierre.martin@test.fr', '0623456789', 'Lyon',
  150000, 200000, 't2', 45, 65, 2,
  'acheteur', 'contacte', 'TIEDE', 'en_cours', '4 mois', 'Premier achat', 'danye.services@gmail.com'),
-- Locataire Lyon 6, cherche T2 location
('Sophie', 'Bernard', 'sophie.bernard@test.fr', '0634567890', 'Lyon 6',
  600, 950, 't2', 40, 55, 2,
  'locataire', 'nouveau', 'FROID', 'aucun', '1 mois', 'CDI récent', 'danye.services@gmail.com'),
-- Acheteur Paris 11ème, T2
('Lucas', 'Petit', 'lucas.petit@test.fr', '0645678901', 'Paris 11',
  350000, 420000, 't2', 35, 50, 2,
  'acheteur', 'nouveau', 'CHAUD', 'valide', '3 mois', 'Proche métro', 'danye.services@gmail.com'),
-- Locataire Paris 18ème
('Emma', 'Leroy', 'emma.leroy@test.fr', '0656789012', 'Paris 18',
  900, 1300, 't3', 55, 75, 3,
  'locataire', 'contacte', 'TIEDE', 'aucun', '2 mois', 'Famille avec enfant', 'danye.services@gmail.com'),
-- Acheteur Marseille T4
('Thomas', 'Moreau', 'thomas.moreau@test.fr', '0667890123', 'Marseille',
  320000, 380000, 't4', 90, 120, 4,
  'acheteur', 'nouveau', 'CHAUD', 'valide', '6 mois', 'Maison ou grand T4', 'danye.services@gmail.com');

-- =====================
-- BIENS FICTIFS (listeings)
-- =====================
INSERT INTO listings (
  title, description, price, city, address, postal_code, surface, rooms, bedrooms, bathrooms,
  property_type, transaction_type, status, amenities, elevator, balcony, created_by
) VALUES
-- Lyon 3 — matche Marie Dupont
('T3 lumineux Part-Dieu', 'Appartement refait à neuf, proche gare. Séjour, cuisine équipée, 2 chambres.', 
  245000, 'Lyon 3', '15 rue de la Part-Dieu', '69003', 78, 3, 2, 1,
  't3', 'vente', 'publie', '["balcon", "ascenseur"]'::jsonb, true, true, 'danye.services@gmail.com'),
-- Lyon 3 — matche aussi Marie
('T3 calme Monplaisir', 'Bel appartement années 30, parquet, moulures. Très bon état.',
  268000, 'Lyon 3', '22 avenue Berthelot', '69007', 82, 3, 2, 1,
  't3', 'vente', 'publie', '["balcon", "cave"]'::jsonb, false, true, 'danye.services@gmail.com'),
-- Lyon — matche Pierre Martin (T2)
('T2 cosy Lyon 2', 'Petit T2 idéal premier achat. Cuisine ouverte, dressing.',
  178000, 'Lyon 2', '8 rue de la République', '69002', 48, 2, 1, 1,
  't2', 'vente', 'publie', '["ascenseur"]'::jsonb, true, false, 'danye.services@gmail.com'),
-- Lyon 6 — location, matche Sophie Bernard
('T2 location Lyon 6', 'Appartement rénové, bail 3 ans. Charges comprises.',
  850, 'Lyon 6', '5 rue de Sèze', '69006', 45, 2, 1, 1,
  't2', 'location', 'publie', '["balcon"]'::jsonb, false, true, 'danye.services@gmail.com'),
-- Lyon 7 — autre T2 location
('T2 proche Confluence', 'Quartier dynamique, métro à 5 min. Disponible immédiatement.',
  920, 'Lyon 7', '12 quai Rambaud', '69002', 52, 2, 1, 1,
  't2', 'location', 'publie', '[]'::jsonb, true, true, 'danye.services@gmail.com'),
-- Paris 11 — matche Lucas Petit
('T2 République', 'Proche place de la République. Parquet, hauteur sous plafond 2,80m.',
  398000, 'Paris 11', '45 rue du Chemin Vert', '75011', 38, 2, 1, 1,
  't2', 'vente', 'publie', '["ascenseur", "balcon"]'::jsonb, true, true, 'danye.services@gmail.com'),
-- Paris 18 — matche Emma Leroy (location T3)
('T3 Montmartre', 'Sous les toits, charme parisien. Vue dégagée.',
  1150, 'Paris 18', '7 rue des Abbesses', '75018', 58, 3, 2, 1,
  't3', 'location', 'publie', '["balcon", "ascenseur"]'::jsonb, true, true, 'danye.services@gmail.com'),
-- Marseille — matche Thomas Moreau
('T4 avec terrasse', 'Grand T4 avec terrasse 15m². Proche Vieux-Port.',
  355000, 'Marseille', '18 rue Paradis', '13001', 98, 4, 3, 2,
  't4', 'vente', 'publie', '["balcon", "terrasse", "parking"]'::jsonb, true, true, 'danye.services@gmail.com'),
-- Autre bien Lyon pour varier
('Studio étudiant Lyon', 'Studio meublé, idéal étudiant ou jeune actif.',
  125000, 'Lyon 1', '3 rue de la Bourse', '69001', 25, 1, 1, 1,
  'studio', 'vente', 'publie', '[]'::jsonb, true, false, 'danye.services@gmail.com');
