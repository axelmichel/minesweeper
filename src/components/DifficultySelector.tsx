import { Difficulty, GameConfig } from '../types';
import './DifficultySelector.css';

interface DifficultySelectorProps {
  currentDifficulty: Difficulty;
  customConfig: GameConfig;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onCustomConfigChange: (config: GameConfig) => void;
}

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
        <button
          className={currentDifficulty === 'beginner' ? 'active' : ''}
          onClick={() => onDifficultyChange('beginner')}
        >
          Beginner
        </button>
        <button
          className={currentDifficulty === 'intermediate' ? 'active' : ''}
          onClick={() => onDifficultyChange('intermediate')}
        >
          Intermediate
        </button>
        <button
          className={currentDifficulty === 'expert' ? 'active' : ''}
          onClick={() => onDifficultyChange('expert')}
        >
          Expert
        </button>
        <button
          className={currentDifficulty === 'custom' ? 'active' : ''}
          onClick={() => onDifficultyChange('custom')}
        >
          Custom
        </button>
      </div>
      
      {currentDifficulty === 'custom' && (
        <div className="custom-config">
          <label>
            Rows:
            <input
              type="number"
              min="5"
              max="30"
              value={customConfig.rows}
              onChange={(e) => handleCustomChange('rows', parseInt(e.target.value) || 9)}
            />
          </label>
          <label>
            Columns:
            <input
              type="number"
              min="5"
              max="50"
              value={customConfig.cols}
              onChange={(e) => handleCustomChange('cols', parseInt(e.target.value) || 9)}
            />
          </label>
          <label>
            Bombs:
            <input
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
