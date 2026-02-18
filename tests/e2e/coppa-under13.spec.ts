import { expect, test } from '@playwright/test';

const TRACKING_HOST_SUBSTRINGS = [
  'googletagmanager.com',
  'google-analytics.com',
  'segment.com',
  'api.segment.io',
  'cdn.segment.com',
  'posthog.com',
  'mixpanel.com',
  'amplitude.com',
  'heap.io',
  'facebook.net',
  'connect.facebook.net',
  'hotjar.com',
  'fullstory.com',
  'logrocket.com',
  'clarity.ms',
  'datadoghq.com',
  'newrelic.com',
  'hypandra.com',
];

function isTrackingUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname;
    return TRACKING_HOST_SUBSTRINGS.some(item => hostname.includes(item));
  } catch {
    return false;
  }
}

test('under-13 flow does not load tracking scripts or tracking requests', async ({ page }) => {
  const trackingRequests: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (isTrackingUrl(url)) {
      trackingRequests.push(url);
    }
  });

  await page.goto('/age-gate');
  await page.getByRole('button', { name: 'I am under 13' }).click();
  await expect(page).toHaveURL(/\/under-13$/);

  const thirdPartyScriptCount = await page.locator('script[src^="https://"]').count();
  expect(thirdPartyScriptCount).toBe(0);
  expect(trackingRequests).toEqual([]);
});

test('under-13 flow cannot call spelling write endpoints', async ({ page }) => {
  await page.goto('/age-gate');
  await page.getByRole('button', { name: 'I am under 13' }).click();
  await expect(page).toHaveURL(/\/under-13$/);

  const startResponse = await page.request.post('/api/spelling/session/start', {
    data: { kidId: '00000000-0000-0000-0000-000000000000' },
  });
  expect(startResponse.status()).toBe(403);

  const actionResponse = await page.request.post('/api/spelling/session/action', {
    data: {
      sessionId: '00000000-0000-0000-0000-000000000000',
      type: 'SUBMIT',
      payload: { wordId: 'x', userSpelling: 'x', responseMs: 10 },
    },
  });
  expect(actionResponse.status()).toBe(403);
});
