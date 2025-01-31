import React, { useState, useEffect } from 'react';
import './FootballField.css';

const FootballField = () => {
  const [rotation, setRotation] = useState(90);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [powerMeter, setPowerMeter] = useState(0);
  const ROTATION_SPEED = 3; // Degrees per frame, reduced from 7.5
  const MAX_POWER = 50; // Maximum length of power meter in pixels
  const POWER_GROWTH_SPEED = 0.8;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ') {
        e.preventDefault();
        setActiveKeys(prev => new Set([...prev, 'space']));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setActiveKeys(prev => new Set([...prev, e.key]));
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setActiveKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete('space');
          return newKeys;
        });
        setPowerMeter(0);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setActiveKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(e.key);
          return newKeys;
        });
      }
    };

    let lastTime = performance.now();
    let animationFrameId;

    const updateGame = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to 60fps
      lastTime = currentTime;

      // Update rotation based on the most recently pressed arrow key
      if (activeKeys.has('ArrowLeft') && !activeKeys.has('ArrowRight')) {
        setRotation(prev => prev - ROTATION_SPEED * deltaTime);
      } else if (activeKeys.has('ArrowRight') && !activeKeys.has('ArrowLeft')) {
        setRotation(prev => prev + ROTATION_SPEED * deltaTime);
      }

      // Update power meter
      if (activeKeys.has('space')) {
        setPowerMeter(prev => Math.min(prev + POWER_GROWTH_SPEED * deltaTime, MAX_POWER));
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    if (activeKeys.size > 0) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(updateGame);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeKeys]);

  return (
    <div className="football-field">
      <div className="end-zone north">
        <div className="team-name lancers">LANCERS</div>
        <div className="goal-post north"></div>
        <div className="pylon left"></div>
        <div className="pylon right"></div>
      </div>
      <div className="main-field">
        {/* Football and Power Meter */}
        <div className="football-container" style={{ 
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`, 
          top: '80%', 
          left: '50%', 
          position: 'absolute' 
        }}>
          <div className="football">🏈</div>
          <div className="power-meter" style={{ height: `${powerMeter}px` }}></div>
        </div>
        
        {/* Yard lines with numbers and hash marks */}
        {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((number, index) => (
          <div key={index} className={`field-section ${number === 50 ? 'fifty' : ''}`} style={{ top: `${(index + 1) * 10}%` }}>
            <div className="yard-line"></div>
            <div className="yard-number left">{number}</div>
            <div className="yard-number right">{number}</div>
            <div className="hash-marks">
              <div className="hash left"></div>
              <div className="hash right"></div>
            </div>
          </div>
        ))}
        
        {/* Sidelines */}
        <div className="sideline left"></div>
        <div className="sideline right"></div>
      </div>
      <div className="end-zone south">
        <div className="team-name wildcats">WILDCATS</div>
        <div className="goal-post south"></div>
        <div className="pylon left"></div>
        <div className="pylon right"></div>
      </div>
    </div>
  );
};

export default FootballField; 