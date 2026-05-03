import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { leaderboardCommand, handleLeaderboard } from './commands/leaderboard';

// need GuildVoiceStates to know whos in voice channels for the activity
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

  // register slash commands with discord globally.
  // heads up: global commands can take up to an hour to show up in servers.
  // for faster testing during dev, you could use guild-specific commands instead
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(appId), {
    body: [leaderboardCommand.toJSON()],
  });
  console.log('Registered slash commands');

  botClient.on('ready', () => {
    console.log(`Bot logged in as ${botClient.user?.tag}`);
  });

  // route incoming slash commands to their handlers
  botClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'leaderboard') {
      await handleLeaderboard(interaction);
    }
  });

  await botClient.login(token);
}
