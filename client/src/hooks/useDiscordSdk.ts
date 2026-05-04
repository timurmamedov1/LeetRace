import { useState, useEffect } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { setAuthToken } from '../lib/api';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

// single SDK instance, has to be created at module level or it breaks.
// wrapped in try/catch bc the constructor throws if we're not inside
// discord's iframe (missing frame_id param). lets us test in browser
let discordSdk: DiscordSDK | null = null;
try {
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_APP_ID);
} catch {
  console.warn('Discord SDK init failed, probably not in an iframe');
}

export interface DiscordSdkState {
  authenticated: boolean;
  user: User | null;
  error: string | null;
  sdk: DiscordSDK;
  channelId: string | null;
  guildId: string | null;
}

// module-level promise so strict mode double-mount doesnt fire auth twice.
// first call kicks off the flow, second call just awaits the same promise
let authPromise: Promise<User> | null = null;

async function doAuth(): Promise<User> {
  if (!discordSdk) throw new Error('Not running inside Discord');

  await discordSdk.ready();

  // ask discord for a temp auth code for this user
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_APP_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // exchange code for access token thru our backend
  // (has to be server-side bc it needs the client_secret)
  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) throw new Error('Token exchange failed');

  const { access_token } = await res.json();

  // store token so all future api calls include it
  setAuthToken(access_token);

  // finish auth with the token we got back
  const auth = await discordSdk.commands.authenticate({ access_token });
  return auth.user as User;
}

// handles the full oauth2 flow for the activity iframe
// sdk ready -> get auth code -> exchange for token on our backend -> authenticate
export function useDiscordSdk(): DiscordSdkState {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // reuse the same promise if strict mode double-mounts us
    if (!authPromise) authPromise = doAuth();

    authPromise
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setAuthenticated(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : JSON.stringify(e);
          console.error('Discord auth failed:', e);
          setError(msg);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return {
    authenticated,
    user,
    error,
    sdk: discordSdk!,
    // these come from the iframe url params, available immediately
    channelId: discordSdk?.channelId ?? null,
    guildId: discordSdk?.guildId ?? null,
  };
}
