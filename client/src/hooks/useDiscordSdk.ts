import { useState, useEffect } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { setAuthToken } from '../lib/api';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

// single SDK instance, has to be created at module level or it breaks
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_APP_ID);

export interface DiscordSdkState {
  authenticated: boolean;
  user: User | null;
  error: string | null;
  sdk: DiscordSDK;
  channelId: string | null;
  guildId: string | null;
}

// handles the full oauth2 flow for the activity iframe
// sdk ready -> get auth code -> exchange for token on our backend -> authenticate
export function useDiscordSdk(): DiscordSdkState {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
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

        if (!cancelled) {
          setUser(auth.user as User);
          setAuthenticated(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return {
    authenticated,
    user,
    error,
    sdk: discordSdk,
    // these come from the iframe url params, available immediately
    channelId: discordSdk.channelId,
    guildId: discordSdk.guildId,
  };
}
