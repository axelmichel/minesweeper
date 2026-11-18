import { Ore } from '../types';
import { PixelText } from '../pixel/PixelText';
import { Sprite } from '../pixel/Sprite';
import { ORE_SPRITES } from '../pixel/sprites';
import './Inventory.css';

export const ORES: Ore[] = ['coal', 'iron', 'gold', 'diamond'];

const NAMES: Record<Ore, string> = { coal: 'Coal', iron: 'Raw iron', gold: 'Raw gold', diamond: 'Diamond' };

/** The ore dug up this game, one slot each, with the count in the corner as in Minecraft. */
export function Inventory({ counts }: { counts: Record<Ore, number> }) {
  return (
    <div className="inventory" aria-label="Ore found">
      {ORES.map((ore) => (
        <div
          key={ore}
          className={`slot inventory-slot ${counts[ore] ? '' : 'empty'}`}
          title={`${NAMES[ore]}: ${counts[ore]}`}
          aria-label={`${NAMES[ore]}: ${counts[ore]}`}
        >
          <Sprite sprite={ORE_SPRITES[ore]} className="inventory-sprite" />
          {counts[ore] > 0 && <PixelText text={String(counts[ore])} className="inventory-count" scale={2} />}
        </div>
      ))}
    </div>
  );
}
