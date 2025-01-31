import React, { useState, useEffect } from 'react';
import './FootballField.css';

const FootballField = () => {
  const [rotation, setRotation] = useState(0);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [powerMeter, setPowerMeter] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 80 });
  const [ballVelocity, setBallVelocity] = useState({ x: 0, y: 0 });
  const [isThrown, setIsThrown] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [targetDistance, setTargetDistance] = useState(0);
  const [initialPosition, setInitialPosition] = useState({ x: 50, y: 80 });
  const [throwProgress, setThrowProgress] = useState(0);
  
  const ROTATION_SPEED = 3;
  const MAX_POWER = 100; // Max power value
  const POWER_GROWTH_SPEED = 1.5; // Adjusted for 1.5 seconds to max (100 / 1.5 seconds / 60 frames)
  const THROW_DURATION = 20; // Reduced from 50 to 20 frames for faster throw
  const REST_DURATION = 60; // ~1 second at 60fps
  const MOVEMENT_SPEED = 0.3; // QB movement speed

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ') {
        e.preventDefault();
        setActiveKeys(prev => new Set([...prev, 'space']));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveKeys(prev => new Set([...prev, e.key]));
      } else if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        setActiveKeys(prev => new Set([...prev, e.key.toLowerCase()]));
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        if (activeKeys.has('space') && !isThrown) {
          const angle = rotation * (Math.PI / 180);
          const normalizedPower = powerMeter / MAX_POWER;
          // First 70% of power = 0-40 yards, remaining 30% = 40-65 yards
          const distance = normalizedPower <= 0.7 
            ? (normalizedPower * 1.43) * 40 // 0-40 yards
            : 60 + ((normalizedPower - 0.7) * 1.67) * 25; // 40-65 yards
          
          setIsThrown(true);
          setThrowProgress(0);
          setInitialPosition({ ...ballPosition });
          setTargetDistance(distance);
        }
        
        setActiveKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete('space');
          return newKeys;
        });
        setPowerMeter(0);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setActiveKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(e.key);  // Don't lowercase arrow keys
          return newKeys;
        });
      } else if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        setActiveKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(e.key.toLowerCase());
          return newKeys;
        });
      }
    };

    let lastTime = performance.now();
    let animationFrameId;

    const updateGame = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      // Update rotation
      if (activeKeys.has('ArrowLeft') && !activeKeys.has('ArrowRight')) {
        setRotation(prev => prev - ROTATION_SPEED * deltaTime);
      } else if (activeKeys.has('ArrowRight') && !activeKeys.has('ArrowLeft')) {
        setRotation(prev => prev + ROTATION_SPEED * deltaTime);
      }

      // Update QB position if not thrown
      if (!isThrown) {
        setBallPosition(prev => {
          const newPos = { ...prev };
          if (activeKeys.has('w')) newPos.y = Math.max(10, prev.y - MOVEMENT_SPEED * deltaTime);
          if (activeKeys.has('s')) newPos.y = Math.min(90, prev.y + MOVEMENT_SPEED * deltaTime);
          if (activeKeys.has('a')) newPos.x = Math.max(5, prev.x - MOVEMENT_SPEED * deltaTime);
          if (activeKeys.has('d')) newPos.x = Math.min(95, prev.x + MOVEMENT_SPEED * deltaTime);
          return newPos;
        });
      }

      // Update power meter
      if (activeKeys.has('space')) {
        setPowerMeter(prev => Math.min(prev + POWER_GROWTH_SPEED * deltaTime, MAX_POWER));
      }

      // Update ball movement when thrown
      if (isThrown) {
        if (throwProgress >= THROW_DURATION) {
          // Ball has reached destination
          setRestTimer(prev => prev + 1);
          if (restTimer >= REST_DURATION) {
            setIsThrown(false);
            setBallPosition({ x: 50, y: 80 });
            setRestTimer(0);
            setThrowProgress(0);
          }
        } else {
          // Update throw progress
          setThrowProgress(prev => prev + deltaTime);
          const progress = Math.min(throwProgress / THROW_DURATION, 1);
          const angle = rotation * (Math.PI / 180);
          
          // Calculate new position based on progress
          const distanceProgress = targetDistance * (progress / 100); // Convert yards to percentage of field
          setBallPosition({
            x: initialPosition.x + Math.sin(angle) * distanceProgress * 100,
            y: initialPosition.y - Math.cos(angle) * distanceProgress * 100
          });
        }

        // Reset if out of bounds
        if (ballPosition.y > 100 || ballPosition.y < 0 || 
            ballPosition.x > 100 || ballPosition.x < 0) {
          setIsThrown(false);
          setBallPosition({ x: 50, y: 80 });
          setRestTimer(0);
          setThrowProgress(0);
        }
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    if (activeKeys.size > 0 || isThrown) {
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
  }, [activeKeys, isThrown, rotation, powerMeter, ballPosition, targetDistance, throwProgress, restTimer, initialPosition]);

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
          top: `${ballPosition.y}%`, 
          left: `${ballPosition.x}%`, 
          position: 'absolute' 
        }}>
          <div className="football">🏈</div>
          {!isThrown && (
            <div className="power-meter" style={{ 
              height: `${Math.max(5, powerMeter)}px`
            }}></div>
          )}
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