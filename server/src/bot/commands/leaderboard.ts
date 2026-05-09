import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../../db/queries';

// slash command definition, registered with discord on bot startup
export const leaderboardCommand = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the top 10 players by wins');

// builds an embed showing top 10 players ranked by wins.
// only works in a server (not DMs) since stats are per guild
export async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command only works in a server.', ephemeral: true });
    return;
  }

  const entries = getLeaderboard(interaction.guildId);

  if (entries.length === 0) {
    await interaction.reply({ content: 'No games have been played in this server yet.', ephemeral: true });
    return;
  }

  // format each row: rank, name, wins/games played, and streak if > 1
  const lines = entries.map((entry, i) => {
    const streak = entry.currentStreak > 1 ? `  |  Streak: ${entry.currentStreak}` : '';
    const winRate = entry.gamesPlayed > 0
      ? Math.round((entry.wins / entry.gamesPlayed) * 100)
      : 0;
    return `\`${String(i + 1).padStart(2)}.\`  **${entry.username}** - ${entry.wins} wins / ${entry.gamesPlayed} played (${winRate}%)${streak}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Leaderboard')
    .setDescription(lines.join('\n'))
    .setColor(0x2b2d31)
    .setFooter({ text: `${entries.length} player${entries.length === 1 ? '' : 's'} ranked` });

  await interaction.reply({ embeds: [embed] });
}
