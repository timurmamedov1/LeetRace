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
    console.warn('Bot token or app ID missing, skipping bot startup');
    return;
  }

  // fetch existing commands first so we dont accidentally nuke
  // discord's auto-generated entry point command for the activity
  const rest = new REST().setToken(token);
  const existingCommands = await rest.get(Routes.applicationCommands(appId)) as any[];
  const entryPointCommands = existingCommands.filter((c: any) => c.type === 4);

  await rest.put(Routes.applicationCommands(appId), {
    body: [...entryPointCommands, leaderboardCommand.toJSON()],
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
