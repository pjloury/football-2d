import React, { useState, useEffect } from 'react';
import './FootballField.css';

const GameState = {
  READY: 'READY',           // Ready to hike
  PLAYING: 'PLAYING',       // Ball in play
  PASS_COMPLETE: 'PASS_COMPLETE',
  PASS_INCOMPLETE: 'PASS_INCOMPLETE',
  TOUCHDOWN: 'TOUCHDOWN',
  SACKED: 'SACKED',
  GAME_OVER: 'GAME_OVER'
};

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
  const [gameState, setGameState] = useState(GameState.READY);
  
  const ROTATION_SPEED = 1;
  const MAX_POWER = 100;
  const POWER_GROWTH_SPEED = 1.7;
  const BALL_SPEED = 1;
  const REST_DURATION = 60;
  const MOVEMENT_SPEED = 0.07;
  const RECEIVER_SPEED = 20;
  const PLAY_DEAD_DURATION = 60;
  const TOUCHDOWN_DURATION = 300; // 5 seconds at 60fps
  const CORNERBACK_SPEED = 19;
  const LINEBACKER_SPEED = 11;
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

  const resetPositions = (options = {}) => {
    const {
      scrimmageY = 80,
      shouldResetScore = false,
      shouldAddTouchdown = false,
      shouldIncrementDown = false,
      isFullReset = false,
      newState = GameState.READY
    } = options;

    // Handle down progression first
    let shouldTransitionToGameOver = false;
    if (shouldIncrementDown) {
      const nextDown = currentDown + 1;
      if (nextDown > 4) {
        shouldTransitionToGameOver = true;
      } else {
        setCurrentDown(nextDown);
      }
    }

    // For incomplete passes, complete passes, and sacks, delay the position reset
    if ([GameState.PASS_COMPLETE, GameState.PASS_INCOMPLETE, GameState.SACKED].includes(newState)) {
      // Set the game state immediately to show the message
      setGameState(newState);
      setGameStarted(false);
      
      // Wait 1 second before resetting positions
      setTimeout(() => {
        // Reset positions
        setBallPosition({ x: 50, y: scrimmageY - 3 });
        setQuarterbackPosition({ x: 50, y: scrimmageY });
        setReceiverPosition({ x: 75, y: scrimmageY });
        setCornerbackPosition({ x: 75, y: scrimmageY - 5 });
        setLinebackerPosition({ x: 50, y: scrimmageY - 20 });
        setInitialPosition({ x: 50, y: scrimmageY });
        
        // Reset other game states
        setRotation(0);
        setPowerMeter(0);
        setIsAdjusting(false);
        setIsThrown(false);
        setIsCaught(false);
        setIsSacked(false);
        setCatchOffset({ x: 0, y: 0 });
        setRestTimer(0);
        setThrowProgress(0);
        setHasReachedMax(false);
        setTargetDistance(0);
        setThrowDuration(0);
        setIsTouchdown(false);
        setIsTackled(false);

        // Wait another 1 second before transitioning state
        setTimeout(() => {
          if (shouldTransitionToGameOver) {
            setGameState(GameState.GAME_OVER);
          } else {
            setGameState(GameState.READY);
          }
        }, 1000);
      }, 1000);
      
      return;
    }

    // For other states (touchdown, game over, etc.), reset immediately
    setBallPosition({ x: 50, y: scrimmageY - 3 });
    setQuarterbackPosition({ x: 50, y: scrimmageY });
    setReceiverPosition({ x: 75, y: scrimmageY });
    setCornerbackPosition({ x: 75, y: scrimmageY - 5 });
    setLinebackerPosition({ x: 50, y: scrimmageY - 20 });
    setInitialPosition({ x: 50, y: scrimmageY });
    
    // Reset game state
    setGameState(newState);
    setGameStarted(false);
    setRotation(0);
    setPowerMeter(0);
    setIsAdjusting(false);
    setIsThrown(false);
    setIsCaught(false);
    setIsSacked(false);
    setCatchOffset({ x: 0, y: 0 });
    setRestTimer(0);
    setThrowProgress(0);
    setHasReachedMax(false);
    setTargetDistance(0);
    setThrowDuration(0);
    setIsTouchdown(false);
    setIsTackled(false);
    
    // Handle scoring
    if (shouldResetScore) {
      setScore(0);
    }
    if (shouldAddTouchdown) {
      setScore(prev => prev + 7);
      setCurrentDown(1); // Reset downs after touchdown
    }

    // Handle full reset
    if (isFullReset) {
      setCurrentDown(1);
      setNewScrimmage(80);
      setActiveKeys(new Set());
      setShowInstructions(false);
    }
  };

  const handlePlayOutcome = (outcome, scrimmageY) => {
    // First show the outcome message
    setGameState(outcome);
    setGameStarted(false);
    setIsThrown(false);
    setActiveKeys(new Set()); // Clear any active keys immediately
    
    // Handle down increment
    const nextDown = currentDown + 1;
    
    // Wait 1 second with current positions to show the outcome
    setTimeout(() => {
      // Reset positions
      setBallPosition({ x: 50, y: scrimmageY - 3 });
      setQuarterbackPosition({ x: 50, y: scrimmageY });
      setReceiverPosition({ x: 75, y: scrimmageY });
      setCornerbackPosition({ x: 75, y: scrimmageY - 5 });
      setLinebackerPosition({ x: 50, y: scrimmageY - 20 });
      setInitialPosition({ x: 50, y: scrimmageY });
      
      // Reset other game states
      setRotation(0);
      setPowerMeter(0);
      setIsAdjusting(false);
      setIsCaught(false);
      setIsSacked(false);
      setCatchOffset({ x: 0, y: 0 });
      setRestTimer(0);
      setThrowProgress(0);
      setHasReachedMax(false);
      setTargetDistance(0);
      setThrowDuration(0);
      setIsTouchdown(false);
      setIsTackled(false);
      setPlayDeadTimer(0);

      // Only transition to game over on 4th down if it wasn't a touchdown
      if (currentDown === 4 && outcome !== GameState.TOUCHDOWN) {
        setGameState(GameState.GAME_OVER);
      } else {
        // Otherwise increment down and transition to READY
        setCurrentDown(nextDown);
        setGameState(GameState.READY);
      }
    }, 1000);
  };

  // Add an effect to monitor game state and only transition to READY when safe
  useEffect(() => {
    // If we're in an outcome state and all conditions are met, we can transition to READY
    if ([GameState.PASS_COMPLETE, GameState.PASS_INCOMPLETE, GameState.SACKED].includes(gameState)) {
      if (!isThrown && !isCaught && !isSacked && !isTackled && 
          !isTouchdown && activeKeys.size === 0 && 
          playDeadTimer === 0 && throwProgress === 0) {
        // Only transition if we're not on 4th down
        if (currentDown <= 4) {
          setGameState(GameState.READY);
        }
      }
    }
  }, [isThrown, isCaught, isSacked, isTackled, isTouchdown, 
      activeKeys, playDeadTimer, throwProgress, gameState, currentDown]);

  // Add this new function to check if game is truly ready for next play
  const isReadyForPlay = () => {
    return gameState === GameState.READY && 
           !gameStarted && 
           !isThrown && 
           !isCaught && 
           !isSacked && 
           !isTackled && 
           !isTouchdown && 
           activeKeys.size === 0 && 
           playDeadTimer === 0 && 
           throwProgress === 0;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      
      // Handle Escape key always
      if (e.key === 'Escape') {
        setShowInstructions(false);
        return;
      }

      // Only process Return key in READY state or after TOUCHDOWN
      if (e.key === 'Enter') {
        if (gameState === GameState.TOUCHDOWN) {
          // Reset to initial state after touchdown
          resetPositions({ 
            scrimmageY: 80,
            isFullReset: true,
            newState: GameState.READY
          });
          setCurrentDown(1);
          return;
        }
        if (gameState === GameState.READY) {
          setGameState(GameState.PLAYING);
          setGameStarted(true);
          setActiveKeys(new Set());
          return;
        }
        // Ignore Return key in all other states
        return;
      }
      
      // Only allow gameplay keys in PLAYING state when game is fully started
      if (gameState === GameState.PLAYING && gameStarted) {
        if (e.key === ' ') {
          e.preventDefault();
          setActiveKeys(prev => new Set([...prev, 'space']));
        } else if (['ArrowUp', 'ArrowDown'].includes(e.key) && activeKeys.has('space') && !isThrown) {
          e.preventDefault();
          setIsAdjusting(true);
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
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Escape') {
        setShowInstructions(false);
        return;
      }
      
      // Only process key ups in PLAYING state when game is fully started
      if (gameState !== GameState.PLAYING || !gameStarted) {
        return;
      }
      
      if (e.key === ' ') {
        if (activeKeys.has('space') && !isThrown) {
          const angle = rotation * (Math.PI / 180);
          const normalizedPower = powerMeter / MAX_POWER;
          const distance = normalizedPower <= 0.7 
            ? (normalizedPower * 1.43) * 40
            : 60 + ((normalizedPower - 0.7) * 1.67) * 25;
          
          setIsThrown(true);
          setThrowProgress(0);
          setInitialPosition({ ...ballPosition });
          setTargetDistance(distance);
          setHasReachedMax(false);
          setIsAdjusting(false);
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
          newKeys.delete(e.key);
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

      // Only allow game updates in PLAYING state
      if (gameState !== GameState.PLAYING) {
        // Still allow touchdown timer to run
        if (isTouchdown) {
          setTouchdownTimer(prev => prev + 1);
          if (touchdownTimer >= TOUCHDOWN_DURATION) {
            resetPositions({ 
              scrimmageY: 80,
              shouldAddTouchdown: true,
              isFullReset: true 
            });
          }
        }
        return;
      }

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
            const newScrimmageLine = receiverPosition.y;
            setNewScrimmage(newScrimmageLine);
            handlePlayOutcome(GameState.PASS_COMPLETE, newScrimmageLine);
          }
        }
      }

      // Add linebacker movement and sack detection
      if (gameState === GameState.PLAYING && !isThrown && !isSacked) {
        setLinebackerPosition(prev => {
          const dx = ballPosition.x - prev.x;
          const dy = ballPosition.y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < SACK_DISTANCE) {
            const newScrimmageLine = Math.min(100, ballPosition.y + 5);
            setNewScrimmage(newScrimmageLine);
            setIsSacked(true);
            handlePlayOutcome(GameState.SACKED, newScrimmageLine);
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
            setGameStarted(false);
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
        if (newBallPosition.y <= 0 && gameState !== GameState.TOUCHDOWN) {
          setGameState(GameState.TOUCHDOWN);
          setGameStarted(false);
          setScore(prev => prev + 7); // Add points immediately
          setActiveKeys(new Set()); // Clear any active keys
          return;
        }
      } else if (isThrown) {
        if (throwProgress >= throwDuration) {
          // If ball wasn't caught by end of throw, it's incomplete
          if (!isCaught) {
            handlePlayOutcome(GameState.PASS_INCOMPLETE, newScrimmage);
            return;
          }
          
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
          handlePlayOutcome(GameState.PASS_INCOMPLETE, newScrimmage);
          return;
        }
      }

      // Update touchdown timer and reset
      if (isTouchdown) {
        setTouchdownTimer(prev => prev + 1);
        if (touchdownTimer >= TOUCHDOWN_DURATION) {
          // Reset everything after touchdown celebration
          setTouchdownTimer(0);
          setIsTouchdown(false);
          setGameStarted(false);
          setBallPosition({ x: 50, y: 80 - 3 }); // Ball 3 units above QB
          setQuarterbackPosition({ x: 50, y: 80 });
          setReceiverPosition({ x: 75, y: 80 });
          setCornerbackPosition({ x: 75, y: 75 });
          setLinebackerPosition({ x: 50, y: 60 });
          setRotation(0);
          setPowerMeter(0);
          setHasReachedMax(false);
          setIsAdjusting(false);
          setIsThrown(false);
          setIsCaught(false);
          setIsSacked(false);
          setCatchOffset({ x: 0, y: 0 });
          setRestTimer(0);
          setThrowProgress(0);
          setTargetDistance(0);
          setInitialPosition({ x: 50, y: 80 });
          setThrowDuration(0);
          setCurrentDown(1); // Reset to first down for new possession
          setNewScrimmage(80); // Reset to 20 yard line
          setIsTackled(false);
          setShowPassComplete(false);
          setShowPassIncomplete(false);
          setShowSacked(false);
          setPlayDeadTimer(0);
          setIsGameOver(false);
          setScore(prev => prev + 7); // Add 7 points for touchdown
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
    resetPositions({
      scrimmageY: 80,
      shouldResetScore: true,
      isFullReset: true,
      newState: GameState.READY
    });
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
        {gameState === GameState.GAME_OVER ? (
          <button className="play-again-button" onClick={resetGame}>
            Play Again?
          </button>
        ) : (
          gameState === GameState.TOUCHDOWN ? 'Press Return to Keep Playing' : 
          gameState === GameState.READY ? 'Press Return to Hike Ball' :
          ''
        )}
      </div>

      {gameState === GameState.TOUCHDOWN && (
        <div className="touchdown-message">
          TOUCHDOWN!
        </div>
      )}

      {gameState === GameState.PASS_COMPLETE && (
        <div className="pass-complete-message">
          PASS COMPLETE
        </div>
      )}

      {gameState === GameState.PASS_INCOMPLETE && (
        <div className="pass-incomplete-message">
          PASS INCOMPLETE
        </div>
      )}

      {gameState === GameState.SACKED && (
        <div className="sacked-message">
          SACKED
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
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