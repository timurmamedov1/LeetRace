import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const leaderboardCommand = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the top 10 players by wins');

// TODO: hook this up to the db once we build the stats system
export async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  await interaction.reply('Leaderboard coming soon!');
}
