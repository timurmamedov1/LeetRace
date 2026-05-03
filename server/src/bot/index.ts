import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { leaderboardCommand, handleLeaderboard } from './commands/leaderboard';

// need GuildVoiceStates intent to detect activity participants
export const botClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_APP_ID;

  if (!token || !appId) {
    console.warn('Bot token or app ID missing — skipping bot startup');
    return;
  }

  // register slash commands globally (can take up to an hr to propagate)
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(appId), {
    body: [leaderboardCommand.toJSON()],
  });
  console.log('Registered slash commands');

  botClient.on('ready', () => {
    console.log(`Bot logged in as ${botClient.user?.tag}`);
  });

  botClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'leaderboard') {
      await handleLeaderboard(interaction);
    }
  });

  await botClient.login(token);
}
