/**
 * Content Script - Injected into webpages
 * Can interact with page DOM and communicate with background script
 */

// Detect company information from the current page
function detectCompanyInfo(): { name?: string; domain?: string } | null {
  const domain = window.location.hostname;

  // Try to extract company name from page title
  const title = document.title;

  return {
    domain,
    name: title.split('|')[0]?.trim() || title.split('-')[0]?.trim(),
  };
}

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
    if (message.type === 'GET_PAGE_INFO') {
      const companyInfo = detectCompanyInfo();
      sendResponse(companyInfo);
    }
    return true;
  }
);

// Notify that content script is ready
console.log('LINQ AI Content Script loaded');

export {};
