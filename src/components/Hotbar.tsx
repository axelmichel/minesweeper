import { PixelText } from '../pixel/PixelText';
import { Sprite } from '../pixel/Sprite';
import { FLAG, PICKAXE } from '../pixel/sprites';
import './Hotbar.css';

export type Tool = 'dig' | 'flag';

interface HotbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

const SLOTS = [
  { tool: 'dig', sprite: PICKAXE, label: 'Pickaxe: dig' },
  { tool: 'flag', sprite: FLAG, label: 'Flag: mark TNT' },
] as const;

// The two tools, as in Minecraft's hotbar. Keys 1 and 2 switch, F toggles. On a touch screen
// the flag slot is the only way to flag.
export function Hotbar({ tool, onToolChange }: HotbarProps) {
  return (
    <div className="hotbar" role="radiogroup" aria-label="Tool">
      {SLOTS.map((slot, i) => (
        <button
          key={slot.tool}
          className={`hotbar-slot ${tool === slot.tool ? 'selected' : ''}`}
          role="radio"
          aria-checked={tool === slot.tool}
          aria-label={slot.label}
          title={slot.label}
          onClick={() => onToolChange(slot.tool)}
        >
          <Sprite sprite={slot.sprite} className="hotbar-sprite" />
          <PixelText text={String(i + 1)} className="hotbar-key" scale={2} />
        </button>
      ))}
    </div>
  );
}
