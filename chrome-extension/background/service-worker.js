importScripts('/lib/api.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_AUTH') {
    TTT_API.isLoggedIn().then(loggedIn => {
      sendResponse({ loggedIn });
    });
    return true;
  }

  if (message.type === 'SIGN_IN') {
    TTT_API.signIn(message.email, message.password)
      .then(data => sendResponse({ success: true, user: data.user }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'SIGN_OUT') {
    TTT_API.signOut()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_USER') {
    TTT_API.getUser().then(user => sendResponse({ user }));
    return true;
  }

  if (message.type === 'SAVE_LISTING') {
    TTT_API.getUser().then(async user => {
      if (!user) {
        sendResponse({ success: false, error: 'Non connecté' });
        return;
      }
      try {
        const listing = { ...message.data, created_by: user.email, status: 'brouillon' };
        const result = await TTT_API.insertListing(listing);
        sendResponse({ success: true, listing: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (message.type === 'EXTRACT_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: 'Aucun onglet actif' });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT' }, response => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: 'Extension non active sur cette page. Rafraîchissez la page.' });
          return;
        }
        sendResponse(response || { success: false, error: 'Pas de données' });
      });
    });
    return true;
  }

  if (message.type === 'FAB_CLICKED') {
    // Open the popup by focusing the extension action
    // (Chrome doesn't allow programmatic popup opening, but we can badge the icon)
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#095237' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    sendResponse({ success: true });
    return true;
  }
});

// Auto-refresh token every 50 minutes
chrome.alarms.create('refresh-token', { periodInMinutes: 50 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refresh-token') {
    TTT_API.refreshSession().catch(() => {});
  }
});
