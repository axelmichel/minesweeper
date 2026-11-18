import { Difficulty, GameConfig } from '../types';
import { PixelText } from '../pixel/PixelText';
import './DifficultySelector.css';

interface DifficultySelectorProps {
  currentDifficulty: Difficulty;
  customConfig: GameConfig;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onCustomConfigChange: (config: GameConfig) => void;
}

const LEVELS: { id: Difficulty; label: string }[] = [
  { id: 'beginner', label: 'Easy' },
  { id: 'intermediate', label: 'Normal' },
  { id: 'expert', label: 'Hard' },
  { id: 'custom', label: 'Custom' },
];

export function DifficultySelector({
  currentDifficulty,
  customConfig,
  onDifficultyChange,
  onCustomConfigChange,
}: DifficultySelectorProps) {
  const handleCustomChange = (field: keyof GameConfig, value: number) => {
    onCustomConfigChange({
      ...customConfig,
      [field]: value,
    });
  };

  return (
    <div className="difficulty-selector">
      <div className="difficulty-buttons">
        {LEVELS.map(({ id, label }) => (
          <button
            key={id}
            className={`mc-button ${currentDifficulty === id ? 'active' : ''}`}
            aria-pressed={currentDifficulty === id}
            onClick={() => onDifficultyChange(id)}
          >
            <PixelText text={label} color={currentDifficulty === id ? '#ffff55' : '#ffffff'} scale={2} />
          </button>
        ))}
      </div>

      {currentDifficulty === 'custom' && (
        <div className="custom-config">
          <label>
            <PixelText text="Rows" color="#404040" shadow={false} scale={2} />
            <input
              className="mc-input"
              type="number"
              min="5"
              max="30"
              value={customConfig.rows}
              onChange={(e) => handleCustomChange('rows', parseInt(e.target.value) || 9)}
            />
          </label>
          <label>
            <PixelText text="Columns" color="#404040" shadow={false} scale={2} />
            <input
              className="mc-input"
              type="number"
              min="5"
              max="50"
              value={customConfig.cols}
              onChange={(e) => handleCustomChange('cols', parseInt(e.target.value) || 9)}
            />
          </label>
          <label>
            <PixelText text="TNT" color="#404040" shadow={false} scale={2} />
            <input
              className="mc-input"
              type="number"
              min="1"
              max={customConfig.rows * customConfig.cols - 1}
              value={customConfig.bombs}
              onChange={(e) => handleCustomChange('bombs', parseInt(e.target.value) || 10)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
