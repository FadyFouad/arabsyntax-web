import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseChannel, type Channel } from './schema';

const CHANNEL_FILE = path.join(process.cwd(), 'content', 'channel.json');

// Build-time, memoized. Like the videos loader this THROWS on a missing,
// unparsable or invalid file, so bad data fails the build instead of shipping a
// homepage with a broken embed or a wrong outbound link.
let cache: Channel | null = null;

/** The YouTube channel and its trailer. */
export function getChannel(): Channel {
  if (!cache) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(CHANNEL_FILE, 'utf8'));
    } catch (error) {
      throw new Error(`content/channel.json could not be read: ${(error as Error).message}`);
    }
    cache = parseChannel(raw);
  }
  return cache;
}
