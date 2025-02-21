import React, { useState, useEffect } from 'react';
import './FootballField.css';
import sbLogo from '../sb_lix.svg';

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
  // Field constants
  const FIELD_LEFT = 5;     // 5% from left (sideline)
  const FIELD_RIGHT = 95;   // 95% from right (sideline)
  const ENDZONE_TOP = 10;    // Top endzone is 0-10%
  const ENDZONE_BOTTOM = 90; // Bottom endzone is 90-100%

  // Helper function to convert yard line to y-position percentage
  const getYardLinePosition = (yardLine, fromSouth = true) => {
    // Field is 80 units (10-90), representing 100 yards
    // Each yard is 0.8 units
    const yardsFromEndzone = fromSouth ? yardLine : 100 - yardLine;
    return ENDZONE_BOTTOM - (yardsFromEndzone * 0.8);
  };

  // Calculate south 20 yard line position
  const SOUTH_20 = getYardLinePosition(20, true);

  const [rotation, setRotation] = useState(0);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [powerMeter, setPowerMeter] = useState(0);
  const [hasReachedMax, setHasReachedMax] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: SOUTH_20 });
  const [ballVelocity, setBallVelocity] = useState({ x: 0, y: 0 });
  const [isThrown, setIsThrown] = useState(false);
  const [isCaught, setIsCaught] = useState(false);
  const [catchOffset, setCatchOffset] = useState({ x: 0, y: 0 });
  const [restTimer, setRestTimer] = useState(0);
  const [targetDistance, setTargetDistance] = useState(0);
  const [initialPosition, setInitialPosition] = useState({ x: 50, y: SOUTH_20 });
  const [throwProgress, setThrowProgress] = useState(0);
  const [throwDuration, setThrowDuration] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [receiverPosition, setReceiverPosition] = useState({ x: 75, y: SOUTH_20 });
  const [isTouchdown, setIsTouchdown] = useState(false);
  const [cornerbackPosition, setCornerbackPosition] = useState({ x: 75, y: SOUTH_20 - 5 });
  const [linebackerPosition, setLinebackerPosition] = useState({ x: 50, y: SOUTH_20 - 20 });
  const [quarterbackPosition, setQuarterbackPosition] = useState({ x: 50, y: SOUTH_20 });
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
  const [touchdownReadyForReset, setTouchdownReadyForReset] = useState(false);
  
  const ROTATION_SPEED = 1;
  const MAX_POWER = 100;
  const POWER_GROWTH_SPEED = 1.7;
  const BALL_SPEED = 1;
  const REST_DURATION = 60;
  const MOVEMENT_SPEED = 0.07;
  const RECEIVER_SPEED = 20;
  const PLAY_DEAD_DURATION = 60;
  const TOUCHDOWN_DURATION = 300;
  const CORNERBACK_SPEED = 19;
  const LINEBACKER_SPEED = 11;
  const LINEBACKER_SHORT_FIELD_SPEED = LINEBACKER_SPEED / 2; // Half speed in short field
  const LINEBACKER_OFFSET = 20; // Normal offset from ball
  const MIN_LINEBACKER_OFFSET = 5; // Minimum offset in short field
  const SACK_DISTANCE = 5;
  const SACK_DISTANCE_SHORT_FIELD = 1;
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

  const getLBOffset = (scrimmageY) => {
    // If the normal offset would put the LB out of bounds (negative y position)
    if (scrimmageY - LINEBACKER_OFFSET < 0) {
      // Only reduce the offset enough to keep the LB at y=0
      return scrimmageY;
    }
    // Otherwise use the full offset
    return LINEBACKER_OFFSET;
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

    // Ensure scrimmage line is within field boundaries
    const boundedScrimmageY = Math.max(ENDZONE_TOP, Math.min(ENDZONE_BOTTOM, scrimmageY));
    const lbOffset = getLBOffset(boundedScrimmageY);

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
        setBallPosition({ x: 50, y: boundedScrimmageY - 3 });
        setQuarterbackPosition({ x: 50, y: boundedScrimmageY });
        setReceiverPosition({ x: 75, y: boundedScrimmageY });
        setCornerbackPosition({ x: 75, y: boundedScrimmageY - 5 });
        setLinebackerPosition({ x: 50, y: boundedScrimmageY - lbOffset });
        setInitialPosition({ x: 50, y: boundedScrimmageY });
        
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
    setBallPosition({ x: 50, y: boundedScrimmageY - 3 });
    setQuarterbackPosition({ x: 50, y: boundedScrimmageY });
    setReceiverPosition({ x: 75, y: boundedScrimmageY });
    setCornerbackPosition({ x: 75, y: boundedScrimmageY - 5 });
    setLinebackerPosition({ x: 50, y: boundedScrimmageY - lbOffset });
    setInitialPosition({ x: 50, y: boundedScrimmageY });
    
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
    
    // Calculate linebacker offset
    const lbOffset = getLBOffset(scrimmageY);
    
    // Wait 1 second with current positions to show the outcome
    setTimeout(() => {
      // Reset all positions for next play
      setBallPosition({ x: 50, y: scrimmageY });
      setQuarterbackPosition({ x: 50, y: scrimmageY });
      setReceiverPosition({ x: 75, y: scrimmageY });
      setCornerbackPosition({ x: 75, y: scrimmageY - 5 });
      setLinebackerPosition({ x: 50, y: scrimmageY - lbOffset });
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

  // Update the handleTouchdown function to include the delay
  const handleTouchdown = () => {
    setGameState(GameState.TOUCHDOWN);
    setGameStarted(false);
    setIsTouchdown(true);
    setTouchdownReadyForReset(false);  // Start not ready for reset
    setActiveKeys(new Set());
    
    // After 1 second delay, allow reset
    setTimeout(() => {
      setTouchdownReadyForReset(true);
    }, 1000);
  };

  // Update the resetGame function to handle both game over and touchdown resets
  const resetGame = (afterTouchdown = false) => {
    // Reset all positions and game state to south 20 yard line
    setBallPosition({ x: 50, y: SOUTH_20 });
    setQuarterbackPosition({ x: 50, y: SOUTH_20 });
    setReceiverPosition({ x: 75, y: SOUTH_20 });
    setCornerbackPosition({ x: 75, y: SOUTH_20 - 5 });
    setLinebackerPosition({ x: 50, y: SOUTH_20 - 20 });
    setInitialPosition({ x: 50, y: SOUTH_20 });
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
    setThrowDuration(0);
    setIsTouchdown(false);
    setIsTackled(false);
    setGameStarted(false);
    setCurrentDown(1);
    setNewScrimmage(80);
    setActiveKeys(new Set());
    setShowInstructions(false);
    setPlayDeadTimer(0);
    setTouchdownTimer(0);
    setShowPassComplete(false);
    setShowPassIncomplete(false);
    setShowSacked(false);
    
    // Only add points and keep score if it's after a touchdown
    if (afterTouchdown) {
      setScore(prev => prev + 7);
    } else {
      setScore(0);
    }
    
    setGameState(GameState.READY);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      
      if (e.key === 'Escape') {
        setShowInstructions(false);
        return;
      }

      if (e.key === 'Enter') {
        if (gameState === GameState.TOUCHDOWN && touchdownReadyForReset) {
          resetGame(true);  // Reset with touchdown scoring
          setTouchdownReadyForReset(false);  // Reset the ready state
          return;
        }
        if (gameState === GameState.READY) {
          setGameState(GameState.PLAYING);
          setGameStarted(true);
          setActiveKeys(new Set());
          return;
        }
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
            resetGame(true);
          }
        }
        return;
      }

      // Update receiver position if game started
      if (gameStarted && !isTackled) {
        setReceiverPosition(prev => ({
          ...prev,
          y: Math.max(0, prev.y - (RECEIVER_SPEED * deltaTime) / 100)  // Allow into end zone
        }));

        // Update cornerback to follow receiver with slight delay
        setCornerbackPosition(prev => {
          const targetX = receiverPosition.x - 3;
          const dx = targetX - prev.x;
          const newX = prev.x + dx * 0.1;
          
          return {
            x: Math.max(FIELD_LEFT, Math.min(FIELD_RIGHT, newX)),
            y: Math.max(0, prev.y - (CORNERBACK_SPEED * deltaTime) / 100)  // Allow into end zone
          };
        });

        // Check for touchdown when the ball enters either end zone
        if (isCaught) {
          const newBallPosition = {
            x: receiverPosition.x + catchOffset.x,
            y: receiverPosition.y + catchOffset.y
          };
          setBallPosition(newBallPosition);
          
          // Check for touchdown first, before any other play outcome logic
          if ((newBallPosition.y <= ENDZONE_TOP || newBallPosition.y >= ENDZONE_BOTTOM) && 
              gameState !== GameState.TOUCHDOWN) {
            handleTouchdown();
            return;  // Exit immediately after touchdown
          }

          // Only check for tackle if not a touchdown
          if (!isTouchdown && gameState !== GameState.TOUCHDOWN) {
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
        } else if (isThrown) {
          // Only process throw logic if not a touchdown
          if (!isTouchdown && gameState !== GameState.TOUCHDOWN) {
            if (throwProgress >= throwDuration) {
              // If ball wasn't caught by end of throw, it's incomplete
              if (!isCaught) {
                handlePlayOutcome(GameState.PASS_INCOMPLETE, newScrimmage);
                return;
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

            // Only check sideline bounds if not a touchdown
            if (ballPosition.x > FIELD_RIGHT || ballPosition.x < FIELD_LEFT) {
              handlePlayOutcome(GameState.PASS_INCOMPLETE, newScrimmage);
              return;
            }
          }
        }
      }

      // Add linebacker movement and sack detection
      if (gameState === GameState.PLAYING && !isThrown && !isSacked) {
        setLinebackerPosition(prev => {
          const dx = ballPosition.x - prev.x;
          const dy = ballPosition.y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Determine if we're in a short field situation
          const isShortField = ballPosition.y - ENDZONE_TOP < LINEBACKER_OFFSET;
          // Use appropriate sack distance based on field position
          const currentSackDistance = isShortField ? SACK_DISTANCE_SHORT_FIELD : SACK_DISTANCE;
          
          if (distance < currentSackDistance) {
            const newScrimmageLine = Math.min(ENDZONE_BOTTOM, ballPosition.y + 5);
            setNewScrimmage(newScrimmageLine);
            setIsSacked(true);
            handlePlayOutcome(GameState.SACKED, newScrimmageLine);
            return prev;
          }

          // Use slower speed in short field situations
          const currentSpeed = isShortField ? LINEBACKER_SHORT_FIELD_SPEED : LINEBACKER_SPEED;
          
          // Normalize direction and move with constraints
          const speed = (currentSpeed * deltaTime) / 100;
          return {
            x: Math.max(FIELD_LEFT, Math.min(FIELD_RIGHT, prev.x + (dx / distance) * speed)),
            y: Math.max(0, Math.min(ENDZONE_BOTTOM, prev.y + (dy / distance) * speed)) // Allow LB to enter end zone
          };
        });
      }

      // Handle play dead timer and reset ONLY if not a touchdown
      if (!isTouchdown && gameState !== GameState.TOUCHDOWN) {
        if ((isTackled || isSacked || (isThrown && !isCaught && throwProgress >= throwDuration))) {
          setPlayDeadTimer(prev => prev + 1);
          if (playDeadTimer >= PLAY_DEAD_DURATION) {
            // Reset positions after delay
            setBallPosition({ x: 50, y: newScrimmage });
            setQuarterbackPosition({ x: 50, y: newScrimmage });
            setReceiverPosition({ x: 75, y: newScrimmage });
            setCornerbackPosition({ x: 75, y: newScrimmage - 5 });
            setLinebackerPosition({ x: 50, y: newScrimmage - getLBOffset(newScrimmage) });
            setPlayDeadTimer(0);
            setIsThrown(false);
            setIsCaught(false);
            setIsSacked(false);
            setCatchOffset({ x: 0, y: 0 });
            setRestTimer(0);
            setThrowProgress(0);
            setShowPassComplete(false);
            setShowPassIncomplete(false);
            setInitialPosition({ x: 50, y: newScrimmage });
            setGameStarted(false);
            setIsTackled(false);
          }
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
        if (activeKeys.has('w')) newPos.y = Math.max(0, ballPosition.y - MOVEMENT_SPEED * deltaTime);  // Allow into end zone
        if (activeKeys.has('s')) newPos.y = Math.min(100, ballPosition.y + MOVEMENT_SPEED * deltaTime);  // Allow into end zone
        if (activeKeys.has('a')) newPos.x = Math.max(FIELD_LEFT, ballPosition.x - MOVEMENT_SPEED * deltaTime);
        if (activeKeys.has('d')) newPos.x = Math.min(FIELD_RIGHT, ballPosition.x + MOVEMENT_SPEED * deltaTime);
        
        // Only update positions if they've changed
        if (newPos.x !== ballPosition.x || newPos.y !== ballPosition.y) {
          setBallPosition(newPos);
          setQuarterbackPosition({ x: newPos.x, y: newPos.y + 3 });
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

      // Update touchdown timer separately from all other game logic
      if (isTouchdown || gameState === GameState.TOUCHDOWN) {
        setTouchdownTimer(prev => prev + 1);
        if (touchdownTimer >= TOUCHDOWN_DURATION) {
          setTouchdownTimer(0);
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
  }, [activeKeys, isThrown, isCaught, rotation, powerMeter, ballPosition, targetDistance, throwProgress, restTimer, initialPosition, throwDuration, gameStarted, receiverPosition, catchOffset, isTouchdown, touchdownReadyForReset]);

  return (
    <div className="football-field">
      <div className="game-title">Football 2D 🏈</div>
      <img 
        src={sbLogo} 
        alt="Super Bowl LIX" 
        className="super-bowl-logo"
      />
      <img 
        src={sbLogo} 
        alt="Super Bowl LIX Midfield" 
        className="midfield-logo"
      />
      <img 
        src={`${process.env.PUBLIC_URL}/nfl.svg`}
        alt="NFL Logo North 25" 
        className="nfl-field-logo north-25"
      />
      <img 
        src={`${process.env.PUBLIC_URL}/nfl.svg`}
        alt="NFL Logo South 25" 
        className="nfl-field-logo south-25"
      />
      <button 
        className="instructions-button"
        onClick={() => setShowInstructions(true)}
      >
        Instructions
      </button>

      {/* Field Background Layer */}
      <div className="field-background">
        <div className="end-zone north">
          <div className="team-name chiefs">CHIEFS</div>
          <div className="goal-post north"></div>
          <div className="pylon left"></div>
          <div className="pylon right"></div>
        </div>
        <div className="main-field">
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
          <div className="sideline left"></div>
          <div className="sideline right"></div>
        </div>
        <div className="end-zone south">
          <div className="team-name eagles">EAGLES</div>
          <div className="goal-post south"></div>
          <div className="pylon left"></div>
          <div className="pylon right"></div>
        </div>
      </div>

      {/* Game Layer - Players and Ball */}
      <div className="game-layer">
        {/* Players first */}
        <div className="quarterback" style={{
          top: `${quarterbackPosition.y}%`,
          left: `${quarterbackPosition.x}%`
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/white-football-helmet.png`} 
            alt="quarterback"
          />
        </div>

        <div className="receiver" style={{
          top: `${receiverPosition.y}%`,
          left: `${receiverPosition.x}%`
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/white-football-helmet.png`} 
            alt="receiver"
          />
        </div>

        <div className="cornerback" style={{
          top: `${cornerbackPosition.y}%`,
          left: `${cornerbackPosition.x}%`
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/red-football-helmet.png`} 
            alt="cornerback"
          />
        </div>

        <div className="linebacker" style={{
          top: `${linebackerPosition.y}%`,
          left: `${linebackerPosition.x}%`
        }}>
          <img 
            src={`${process.env.PUBLIC_URL}/red-football-helmet.png`} 
            alt="linebacker"
          />
        </div>

        {/* Ball last so it's rendered on top */}
        <div className="football-container" style={{ 
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          top: `${ballPosition.y}%`,
          left: `${ballPosition.x}%`
        }}>
          <div className="football">🏈</div>
          {!isThrown && (
            <div className="power-meter" style={{ 
              height: `${Math.max(5, powerMeter * 2)}px`
            }}></div>
          )}
        </div>
      </div>

      {/* UI Elements */}
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
            {ballPosition.y <= ENDZONE_TOP ? "North End Zone" :
             ballPosition.y >= ENDZONE_BOTTOM ? "South End Zone" :
             // Convert field position percentage to yard line (0-100)
             // Field is 80% of total height (10% each end zone)
             // Yard lines go from 0 to 50 then back to 0
             (() => {
               // Convert position to yards (field is 80 units, from 10 to 90)
               const relativePosition = ((ballPosition.y - ENDZONE_TOP) / 80) * 100;
               // Return the yard line (0-50 from either end)
               return Math.round(relativePosition <= 50 ? relativePosition : 100 - relativePosition);
             })()}
          </span>
        </div>
      </div>

      <div className="start-message">
        {(gameState === GameState.TOUCHDOWN && touchdownReadyForReset) ? 'Press Return to Keep Playing' : 
         gameState === GameState.READY ? 'Press Return to Hike Ball' :
         ''}
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
          <button className="play-again-button" onClick={() => resetGame(false)}>
            Play Again?
          </button>
        </div>
      )}
    </div>
  );
};

export default FootballField;