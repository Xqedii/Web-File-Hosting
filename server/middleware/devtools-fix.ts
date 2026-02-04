import { defineEventHandler, setResponseStatus } from 'h3';

export default defineEventHandler((event) => {
  const url = event.node.req.url || '';
  if (url.includes('com.chrome.devtools.json')) {
    setResponseStatus(event, 404);
    return { error: 'Not Found' };
  }
});