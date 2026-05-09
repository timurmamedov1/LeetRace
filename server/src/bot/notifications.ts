import { EmbedBuilder, TextChannel } from 'discord.js';
import { botClient } from './index';
import { GameSession } from '../types';

// posts a "game started" embed to the voice channel's text chat
export async function postGameStarted(session: GameSession): Promise<void> {
  const channel = await getChannel(session.channelId);
  if (!channel) return;

  const playerList = Array.from(session.players.values())
    .map(p => p.username)
    .join(', ');

  const embed = new EmbedBuilder()
    .setTitle('LeetRace Started')
    .setDescription(`**${session.problem?.title}** (#${session.problem?.frontendQuestionId})`)
    .addFields(
      { name: 'Difficulty', value: session.difficulty, inline: true },
      { name: 'Time Limit', value: formatTime(session.timeLimitSeconds), inline: true },
      { name: 'Players', value: playerList, inline: false },
    )
    .setColor(0x5865F2)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// posts final results after a round ends
export async function postGameResults(session: GameSession): Promise<void> {
  const channel = await getChannel(session.channelId);
  if (!channel) return;

  // sort by placement, ppl who didnt finish go to the bottom
  const players = Array.from(session.players.values())
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return 0;
    });

  const lines = players.map(p => {
    if (p.rank === null) return `**DNF** ${p.username}`;
    const time = p.completedAt && session.startedAt
      ? formatTime(Math.floor((p.completedAt - session.startedAt) / 1000))
      : '—';
    return `**${p.rank}.** ${p.username} (${time})`;
  });

  const embed = new EmbedBuilder()
    .setTitle('LeetRace Results')
    .setDescription(`**${session.problem?.title}** (#${session.problem?.frontendQuestionId})\n\n${lines.join('\n')}`)
    .setColor(0x2b2d31)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// get a text sendable channel by id. works for both text and voice
// channels since discord voice channels have built in text chat now
async function getChannel(channelId: string): Promise<TextChannel | null> {
  try {
    const channel = await botClient.channels.fetch(channelId);
    if (!channel || !('send' in channel)) return null;
    return channel as TextChannel;
  } catch {
    console.error(`Failed to fetch channel ${channelId} for bot notification`);
    return null;
  }
}

// turns seconds into a readable duration like "5m 30s" or just "5m"
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
