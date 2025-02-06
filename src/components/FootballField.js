import React, { useState, useEffect } from 'react';
import './FootballField.css';

const FootballField = () => {
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
  const [cornerbackPosition, setCornerbackPosition] = useState({ x: 75, y: 75 });
  const [linebackerPosition, setLinebackerPosition] = useState({ x: 50, y: 60 });
  const [quarterbackPosition, setQuarterbackPosition] = useState({ x: 50, y: 80 });
  const [isSacked, setIsSacked] = useState(false);
  const [showSacked, setShowSacked] = useState(false);
  const [showPassComplete, setShowPassComplete] = useState(false);
  const [showPassIncomplete, setShowPassIncomplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [currentDown, setCurrentDown] = useState(1);
  const [newScrimmage, setNewScrimmage] = useState(80);
  const [playDeadTimer, setPlayDeadTimer] = useState(0);
  const [touchdownTimer, setTouchdownTimer] = useState(0);
  const [incompleteTimer, setIncompleteTimer] = useState(0);
  const [isTackled, setIsTackled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const ROTATION_SPEED = 1;
  const MAX_POWER = 100;
  const POWER_GROWTH_SPEED = 1.7;
  const BALL_SPEED = 1;
  const REST_DURATION = 60;
  const MOVEMENT_SPEED = 0.05;
  const RECEIVER_SPEED = 20;
  const PLAY_DEAD_DURATION = 60;
  const TOUCHDOWN_DURATION = 300;
  const INCOMPLETE_DURATION = 180;
  const SACKED_MESSAGE_DURATION = 120; // 2 seconds at 60fps
  const CORNERBACK_SPEED = 19;
  const LINEBACKER_SPEED = 13;
  const SACK_DISTANCE = 5;
  const TACKLE_DISTANCE = 10;

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
      if (e.key === 'Escape') {
        setShowInstructions(false);
      }
      
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
      if (gameStarted && receiverPosition.y > -10 && !isTackled) {
        setReceiverPosition(prev => ({
          ...prev,
          y: Math.max(-10, prev.y - (RECEIVER_SPEED * deltaTime) / 100)
        }));

        // Update cornerback to follow receiver with slight delay
        setCornerbackPosition(prev => {
          const targetX = receiverPosition.x - 3;
          const dx = targetX - prev.x;
          const newX = prev.x + dx * 0.1;
          
          return {
            x: Math.max(5, Math.min(95, newX)),
            y: Math.max(-10, prev.y - (CORNERBACK_SPEED * deltaTime) / 100)
          };
        });

        // Check for tackle after catch
        if (isCaught) {
          const dx = cornerbackPosition.x - receiverPosition.x;
          const dy = cornerbackPosition.y - receiverPosition.y;
          const distanceToCornerback = Math.sqrt(dx * dx + dy * dy);
          
          if (distanceToCornerback < TACKLE_DISTANCE) {
            setIsTackled(true);
            setShowPassComplete(true);
            setNewScrimmage(receiverPosition.y);
            setGameStarted(false);
          }
        }
      }

      // Add linebacker movement and sack detection
      if (gameStarted && !isThrown && !isSacked && !isTackled) {
        // Move linebacker towards QB
        setLinebackerPosition(prev => {
          const dx = ballPosition.x - prev.x;
          const dy = ballPosition.y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < SACK_DISTANCE) {
            setIsSacked(true);
            setShowSacked(true);
            const newScrimmageLine = Math.min(100, ballPosition.y + 5); // Move back 5 yards
            setNewScrimmage(newScrimmageLine);
            setGameStarted(false);
            // Reset positions for next down
            setBallPosition({ x: 50, y: newScrimmageLine - 3 }); // Ball 3 units above QB
            setQuarterbackPosition({ x: 50, y: newScrimmageLine });
            setReceiverPosition({ x: 75, y: newScrimmageLine });
            setCornerbackPosition({ x: 75, y: newScrimmageLine - 5 });
            setLinebackerPosition({ x: 50, y: newScrimmageLine - 20 });

            // Start a timer to hide the sacked message
            setTimeout(() => {
              setShowSacked(false);
            }, 2000); // 2 seconds

            return prev;
          }

          // Normalize direction and move
          const speed = (LINEBACKER_SPEED * deltaTime) / 100;
          return {
            x: prev.x + (dx / distance) * speed,
            y: prev.y + (dy / distance) * speed
          };
        });
      }

      // Handle play dead timer and reset
      if (isTackled || isSacked || (isThrown && !isCaught && throwProgress >= throwDuration)) {
        setPlayDeadTimer(prev => prev + 1);
        if (playDeadTimer >= PLAY_DEAD_DURATION) {
          // Reset positions after delay
          setBallPosition({ x: 50, y: newScrimmage - 3 }); // Center ball and keep above QB
          setQuarterbackPosition({ x: 50, y: newScrimmage });
          setReceiverPosition({ x: 75, y: newScrimmage });
          setCornerbackPosition({ x: 75, y: newScrimmage - 5 });
          setLinebackerPosition({ x: 50, y: newScrimmage - 20 });
          setPlayDeadTimer(0);
          setIsThrown(false);
          setIsCaught(false);
          setIsSacked(false);
          setCatchOffset({ x: 0, y: 0 });
          setRestTimer(0);
          setThrowProgress(0);
          setShowPassComplete(false);
          setShowPassIncomplete(false);
          setInitialPosition({ x: 50, y: newScrimmage }); // Center initial position
          if (!isTouchdown) {
            const nextDown = currentDown + 1;
            if (nextDown > 4) {
              setIsGameOver(true);
              setGameStarted(false);
            } else {
              setCurrentDown(nextDown);
            }
          }
          setIsTackled(false);
          setGameStarted(false);
        }
      }

      // Update rotation
      if (activeKeys.has('ArrowLeft') && !activeKeys.has('ArrowRight')) {
        setRotation(prev => prev - ROTATION_SPEED * deltaTime);
      } else if (activeKeys.has('ArrowRight') && !activeKeys.has('ArrowLeft')) {
        setRotation(prev => prev + ROTATION_SPEED * deltaTime);
      }

      // Update QB and ball movement together in updateGame
      if (!isThrown && gameStarted && !isTackled && !isSacked) {
        const newPos = { ...ballPosition };
        if (activeKeys.has('w')) newPos.y = Math.max(10, ballPosition.y - MOVEMENT_SPEED * deltaTime);
        if (activeKeys.has('s')) newPos.y = Math.min(90, ballPosition.y + MOVEMENT_SPEED * deltaTime);
        if (activeKeys.has('a')) newPos.x = Math.max(5, ballPosition.x - MOVEMENT_SPEED * deltaTime);
        if (activeKeys.has('d')) newPos.x = Math.min(95, ballPosition.x + MOVEMENT_SPEED * deltaTime);
        
        // Only update positions if they've changed
        if (newPos.x !== ballPosition.x || newPos.y !== ballPosition.y) {
          setBallPosition(newPos);
          setQuarterbackPosition({ x: newPos.x, y: newPos.y + 3 }); // QB 3 units below ball
        }
      }

      // When ball is thrown, QB stays in place
      if (isThrown) {
        // Keep QB in last position before throw
        setQuarterbackPosition(prev => prev);
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
        if (newBallPosition.y <= 0 && !isTouchdown) {  // Only set touchdown once when crossing goal line
          setIsTouchdown(true);
        }
      } else if (isThrown) {
        if (throwProgress >= throwDuration) {
          setRestTimer(prev => prev + 1);
          if (restTimer >= REST_DURATION) {
            setIsThrown(false);
            setIsCaught(false);
            setCatchOffset({ x: 0, y: 0 });
            setBallPosition({ x: 50, y: newScrimmage - 3 }); // Center ball and keep above QB
            setQuarterbackPosition({ x: 50, y: newScrimmage });
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
        if (ballPosition.y > 100 || ballPosition.y < -10 || 
            ballPosition.x > 100 || ballPosition.x < 0) {
          setIsThrown(false);
          setIsCaught(false);
          setCatchOffset({ x: 0, y: 0 });
          setBallPosition({ x: 50, y: newScrimmage - 3 }); // Reset to current scrimmage line
          setQuarterbackPosition({ x: 50, y: newScrimmage });
          setReceiverPosition({ x: 75, y: newScrimmage });
          setCornerbackPosition({ x: 75, y: newScrimmage - 5 });
          setLinebackerPosition({ x: 50, y: newScrimmage - 20 });
          setRestTimer(0);
          setThrowProgress(0);
          setShowPassIncomplete(true);
          setGameStarted(false);
          
          // Start a timer to hide the incomplete message
          setTimeout(() => {
            setShowPassIncomplete(false);
          }, 2000);

          if (currentDown === 4) {
            setIsGameOver(true);
          } else {
            setCurrentDown(prev => prev + 1);
          }
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

  const resetGame = () => {
    setGameStarted(false);
    // Reset ball and QB to scrimmage line
    setBallPosition({ x: 50, y: 80 - 3 }); // Ball 3 units above QB
    setQuarterbackPosition({ x: 50, y: 80 });
    // Reset receiver and defenders relative to scrimmage line
    setReceiverPosition({ x: 75, y: 80 });
    setCornerbackPosition({ x: 75, y: 75 });
    setLinebackerPosition({ x: 50, y: 60 });
    // Reset all game state
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
    setIsSacked(false);
    setShowSacked(false);
    setShowPassComplete(false);
    setShowPassIncomplete(false);
    setIsGameOver(false);
    setScore(0);
    setCurrentDown(1);
    setNewScrimmage(80); // Reset to 20 yard line
    setPlayDeadTimer(0);
    setTouchdownTimer(0);
    setIncompleteTimer(0);
    setIsTackled(false);
    setShowInstructions(false);
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
        <div className="instructions-modal">
          <div className="instructions-content">
            <h2>How to Play</h2>
            <ul>
              <li>Press RETURN to hike the ball</li>
              <li>Use WASD keys to move the quarterback</li>
              <li>Hold SPACE to start throw, release to throw</li>
              <li>Use UP/DOWN arrows while holding SPACE to adjust power</li>
              <li>Use LEFT/RIGHT arrows to aim throw direction</li>
              <li>Score a touchdown in 4 downs to win!</li>
              <li>Watch out for defenders!</li>
            </ul>
            <p className="dismiss-text">Press ESC to close</p>
          </div>
        </div>
      )}

      <div className="scoreboard">
        <div className="stat">
          <span className="label">Score:</span>
          <span className="value">{score}</span>
        </div>
        <div className="stat">
          <span className="label">Down:</span>
          <span className="value">{currentDown}</span>
        </div>
        <div className="stat">
          <span className="label">Ball On:</span>
          <span className="value">
            {100 - newScrimmage > 100 ? "End Zone" : Math.round(100 - newScrimmage)}
          </span>
        </div>
      </div>

      <div className="start-message">
        {isGameOver ? (
          <button className="play-again-button" onClick={resetGame}>
            Play Again?
          </button>
        ) : (
          gameStarted ? 'Press Return to Reset' : 'Press Return to Hike Ball'
        )}
      </div>

      {isTouchdown && (
        <div className="touchdown-message">
          TOUCHDOWN!
        </div>
      )}

      {showPassComplete && !isTouchdown && (
        <div className="pass-complete-message">
          PASS COMPLETE
        </div>
      )}

      {showPassIncomplete && !isTouchdown && !isGameOver && (
        <div className="pass-incomplete-message">
          PASS INCOMPLETE
        </div>
      )}

      {showSacked && !isTouchdown && !isGameOver && (
        <div className="sacked-message">
          SACKED
        </div>
      )}

      {isGameOver && (
        <div className="game-over-container">
          <div className="game-over-message">
            GAME OVER
          </div>
          <button className="play-again-button" onClick={resetGame}>
            Play Again?
          </button>
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

        {/* Quarterback */}
        <div className="quarterback" style={{
          position: 'absolute',
          top: `${quarterbackPosition.y}%`,
          left: `${quarterbackPosition.x}%`,
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px',
          zIndex: 10
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/white-football-helmet.png`} 
            alt="quarterback"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
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
            src={`${process.env.PUBLIC_URL}/white-football-helmet.png`} 
            alt="receiver"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Cornerback */}
        <div className="cornerback" style={{
          position: 'absolute',
          top: `${cornerbackPosition.y}%`,
          left: `${cornerbackPosition.x}%`,
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px',
          zIndex: 10
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/red-football-helmet.png`} 
            alt="cornerback"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Linebacker */}
        <div className="linebacker" style={{
          position: 'absolute',
          top: `${linebackerPosition.y}%`,
          left: `${linebackerPosition.x}%`,
          transform: 'translate(-50%, -50%)',
          width: '24px',
          height: '24px',
          zIndex: 10
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/red-football-helmet.png`} 
            alt="linebacker"
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