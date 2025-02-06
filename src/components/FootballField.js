import React, { useState, useEffect } from 'react';
import './FootballField.css';

const FootballField = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [powerMeter, setPowerMeter] = useState(0);
  const [hasReachedMax, setHasReachedMax] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 80 });
  const [ballVelocity, setBallVelocity] = useState({ x: 0, y: 0 });
  const [isThrown, setIsThrown] = useState(false);
  const [isCaught, setIsCaught] = useState(false);
  const [catchOffset, setCatchOffset] = useState({ x: 0, y: 0 });
  const [restTimer, setRestTimer] = useState(0);
  const [targetDistance, setTargetDistance] = useState(0);
  const [initialPosition, setInitialPosition] = useState({ x: 50, y: 80 });
  const [throwProgress, setThrowProgress] = useState(0);
  const [throwDuration, setThrowDuration] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [receiverPosition, setReceiverPosition] = useState({ x: 75, y: 80 });
  const [isTouchdown, setIsTouchdown] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Instructions escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showInstructions) {
        setShowInstructions(false);
      }
    };

    if (showInstructions) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [showInstructions]);
  
  const ROTATION_SPEED = 1.2;
  const MAX_POWER = 100; // Max power value
  const POWER_GROWTH_SPEED = 1.5; // Adjusted for 1.5 seconds to max (100 / 1.5 seconds / 60 frames)
  const BALL_SPEED = 1; // Reduced from 2 to make throws slower and require more anticipation
  const REST_DURATION = 60; // ~1 second at 60fps
  const MOVEMENT_SPEED = 0.15; // QB movement speed (halved for finer control)
  const RECEIVER_SPEED = 10; // 5 yards per second

  // Game loop effect
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'Enter') {
        if (!gameStarted) {
          setGameStarted(true);
        } else {
          // Reset game state
          setGameStarted(false);
          setBallPosition({ x: 50, y: 80 });
          setReceiverPosition({ x: 75, y: 80 });
          setRotation(0);
          setPowerMeter(0);
          setHasReachedMax(false);
          setIsAdjusting(false);
          setIsThrown(false);
          setIsCaught(false);
          setCatchOffset({ x: 0, y: 0 });
          setRestTimer(0);
          setThrowProgress(0);
          setTargetDistance(0);
          setInitialPosition({ x: 50, y: 80 });
          setThrowDuration(0);
          setIsTouchdown(false);
          setActiveKeys(new Set());
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        setActiveKeys(prev => new Set([...prev, 'space']));
      } else if (['ArrowUp', 'ArrowDown'].includes(e.key) && activeKeys.has('space') && !isThrown) {
        e.preventDefault();
        setIsAdjusting(true);  // Start manual adjustments as soon as arrows are used
        setPowerMeter(prev => {
          if (e.key === 'ArrowUp') {
            return Math.min(prev + 10, MAX_POWER);
          } else {
            return Math.max(prev - 10, 0);
          }
        });
      } else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
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
          setHasReachedMax(false);
          setIsAdjusting(false);
          // Calculate throw duration based on distance and constant speed
          setThrowDuration(distance / BALL_SPEED);
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

      // Update receiver position if game started
      if (gameStarted && receiverPosition.y > 10) {
        setReceiverPosition(prev => ({
          ...prev,
          y: Math.max(10, prev.y - (RECEIVER_SPEED * deltaTime) / 100)
        }));
      }

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

      // Update power meter - only auto-grow if not manually adjusting
      if (activeKeys.has('space') && !isAdjusting) {
        setPowerMeter(prev => {
          const newPower = Math.min(prev + POWER_GROWTH_SPEED * deltaTime, MAX_POWER);
          if (newPower === MAX_POWER && !hasReachedMax) {
            setHasReachedMax(true);
          }
          return newPower;
        });
      }

      // If ball is caught, move it with the receiver maintaining offset
      if (isCaught) {
        const newBallPosition = {
          x: receiverPosition.x + catchOffset.x,
          y: receiverPosition.y + catchOffset.y
        };
        setBallPosition(newBallPosition);
        
        // Check for touchdown when the ball's center crosses the goal line
        if (newBallPosition.y <= 10 && !isTouchdown) {
          setIsTouchdown(true);
        }
      } else if (isThrown) {
        if (throwProgress >= throwDuration) {
          setRestTimer(prev => prev + 1);
          if (restTimer >= REST_DURATION) {
            setIsThrown(false);
            setIsCaught(false);
            setCatchOffset({ x: 0, y: 0 });
            setBallPosition({ x: 50, y: 80 });
            setRestTimer(0);
            setThrowProgress(0);
          }
        } else {
          setThrowProgress(prev => prev + deltaTime);
          const progress = Math.min(throwProgress / throwDuration, 1);
          const angle = rotation * (Math.PI / 180);
          
          const distanceProgress = targetDistance * progress;
          const newBallPosition = {
            x: initialPosition.x + Math.sin(angle) * distanceProgress,
            y: initialPosition.y - Math.cos(angle) * distanceProgress
          };
          
          // Check for catch before updating ball position
          const catchResult = checkCatch(newBallPosition, receiverPosition);
          if (!isCaught && catchResult.caught) {
            setIsCaught(true);
            setCatchOffset(catchResult.offset);
            setBallPosition({
              x: receiverPosition.x + catchResult.offset.x,
              y: receiverPosition.y + catchResult.offset.y
            });
          } else if (!isCaught) {
            setBallPosition(newBallPosition);
          }
        }

        // Reset if out of bounds
        if (ballPosition.y > 100 || ballPosition.y < 0 || 
            ballPosition.x > 100 || ballPosition.x < 0) {
          setIsThrown(false);
          setIsCaught(false);
          setCatchOffset({ x: 0, y: 0 });
          setBallPosition({ x: 50, y: 80 });
          setRestTimer(0);
          setThrowProgress(0);
        }
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    if (activeKeys.size > 0 || isThrown || gameStarted) {
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
  }, [activeKeys, isThrown, isCaught, rotation, powerMeter, ballPosition, targetDistance, throwProgress, restTimer, initialPosition, throwDuration, gameStarted, receiverPosition, catchOffset, isTouchdown]);

  if (isMobile) {
    return (
      <div className="mobile-message">
        <h1>🏈</h1>
        <h2>Desktop Only Game</h2>
        <p>Sorry, this game requires a keyboard and can only be played on a computer.</p>
        <p>Please visit this site on a desktop or laptop to play!</p>
      </div>
    );
  }

  // Check if ball and receiver intersect
  const checkCatch = (ballPos, receiverPos) => {
    const BALL_SIZE = 8;
    const HELMET_SIZE = 8;
    const BASE_CATCH_MARGIN = 15; // Base margin for catching
    const POWER_CATCH_MARGIN = 25; // Reduced from 40 to make high-power throws more likely to miss
    
    const dx = ballPos.x - receiverPos.x;
    const dy = ballPos.y - receiverPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the distance from QB to receiver
    const qbToReceiverDistance = Math.sqrt(
      Math.pow(initialPosition.x - receiverPosition.x, 2) +
      Math.pow(initialPosition.y - receiverPosition.y, 2)
    );

    // Convert field percentage to yards (100% = 100 yards)
    const receiverDistanceYards = qbToReceiverDistance;
    
    // Calculate catch margin based on throw power with more aggressive exponential scaling
    const throwPowerRatio = targetDistance / 65; // 65 is max throw distance
    const powerScaling = Math.pow(throwPowerRatio, 0.9); // More aggressive power scaling (was 0.7)
    const dynamicCatchMargin = BASE_CATCH_MARGIN + (powerScaling * POWER_CATCH_MARGIN);
    
    // If throw is too powerful (beyond receiver + dynamic margin), no catch
    if (targetDistance > receiverDistanceYards + dynamicCatchMargin) {
      return { caught: false };
    }
    
    if (distance < (BALL_SIZE + HELMET_SIZE) / 4) {
      return {
        caught: true,
        offset: {
          x: ballPos.x - receiverPos.x,
          y: ballPos.y - receiverPos.y
        }
      };
    }
    return { caught: false };
  };

  return (
    <div className="football-field">
      <button 
        className="instructions-button"
        onClick={() => setShowInstructions(true)}
      >
        Instructions
      </button>

      {showInstructions && (
        <div className="instructions-overlay" onClick={() => setShowInstructions(false)}>
          <div className="instructions-content" onClick={e => e.stopPropagation()}>
            <h2>How to Play</h2>
            <div className="instruction-section">
              <h3>Movement</h3>
              <p>WASD Keys - Move QB</p>
              <p>Left/Right Arrows - Rotate throw direction</p>
            </div>
            <div className="instruction-section">
              <h3>Throwing</h3>
              <p>Hold SPACE - Charge throw power</p>
              <p>Up/Down Arrows - Fine-tune power while holding SPACE</p>
              <p>Release SPACE - Throw the ball</p>
            </div>
            <div className="instruction-section">
              <h3>Game Controls</h3>
              <p>ENTER - Hike the ball / Reset</p>
              <p>ESC - Close instructions</p>
            </div>
            <button className="close-button" onClick={() => setShowInstructions(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="start-message">
        {gameStarted ? 'Press Return to Reset' : 'Press Return to Start'}
      </div>
      {isTouchdown && (
        <div className="touchdown-message">
          TOUCHDOWN!
        </div>
      )}
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
              height: `${Math.max(5, powerMeter * 2)}px`
            }}></div>
          )}
        </div>

        {/* Wide Receiver */}
        <div className="receiver" style={{
          position: 'absolute',
          top: `${receiverPosition.y}%`,
          left: `${receiverPosition.x}%`,
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px'
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/football-helmet.png`} 
            alt="receiver"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
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