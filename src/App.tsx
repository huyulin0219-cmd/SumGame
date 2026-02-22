/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Pause, 
  AlertCircle,
  Scroll,
  BookOpen,
  Sword,
  Shield,
  Wind,
  Sparkles
} from 'lucide-react';

// --- Constants ---
const GRID_WIDTH = 6;
const GRID_HEIGHT = 6;
const INITIAL_ROWS = 3;
const TARGET_MIN = 10;
const TARGET_MAX = 25;
const NUMBER_MIN = 1;
const NUMBER_MAX = 9;
const TIME_LIMIT = 15;

enum GameMode {
  CLASSIC = 'CLASSIC',
  TIME = 'TIME',
}

interface Block {
  id: string;
  value: number;
  isNew?: boolean;
}

type Grid = (Block | null)[][];

import { generateCoverImage } from './services/imageService';

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [grid, setGrid] = useState<Grid>([]);
  const [selected, setSelected] = useState<{ r: number; c: number }[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [coverStep, setCoverStep] = useState(0); // 0: Cover, 1: Rules/Modes
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch cover image on mount
  useEffect(() => {
    async function fetchImage() {
      try {
        const url = await generateCoverImage();
        setCoverImageUrl(url);
      } catch (error) {
        console.error("Failed to generate cover image:", error);
      } finally {
        setIsLoadingImage(false);
      }
    }
    fetchImage();
  }, []);

  // --- Helpers ---
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const generateTarget = useCallback(() => {
    return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
  }, []);

  const initGrid = useCallback(() => {
    const newGrid: Grid = Array.from({ length: GRID_HEIGHT }, () => 
      Array.from({ length: GRID_WIDTH }, () => null)
    );
    
    for (let r = GRID_HEIGHT - 1; r >= GRID_HEIGHT - INITIAL_ROWS; r--) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        newGrid[r][c] = { 
          id: generateId(), 
          value: Math.floor(Math.random() * (NUMBER_MAX - NUMBER_MIN + 1)) + NUMBER_MIN 
        };
      }
    }
    return newGrid;
  }, []);

  const addRow = useCallback((currentGrid: Grid) => {
    if (currentGrid[0].some(cell => cell !== null)) {
      setIsGameOver(true);
      return currentGrid;
    }

    const newGrid = currentGrid.map(row => [...row]);
    for (let r = 0; r < GRID_HEIGHT - 1; r++) {
      newGrid[r] = newGrid[r + 1];
    }
    
    newGrid[GRID_HEIGHT - 1] = Array.from({ length: GRID_WIDTH }, () => ({
      id: generateId(),
      value: Math.floor(Math.random() * (NUMBER_MAX - NUMBER_MIN + 1)) + NUMBER_MIN,
      isNew: true
    }));

    return newGrid;
  }, []);

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setGrid(initGrid());
    setTarget(generateTarget());
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setIsGameOver(false);
    setIsPaused(false);
    setSelected([]);
  };

  const handleBlockClick = (r: number, c: number) => {
    if (isGameOver || isPaused) return;
    const block = grid[r][c];
    if (!block) return;

    const isAlreadySelected = selected.some(s => s.r === r && s.c === c);
    if (isAlreadySelected) {
      setSelected(selected.filter(s => !(s.r === r && s.c === c)));
    } else {
      setSelected([...selected, { r, c }]);
    }
  };

  const [isShaking, setIsShaking] = useState(false);

  const checkSum = useCallback(() => {
    const currentSum = selected.reduce((acc, s) => acc + (grid[s.r][s.c]?.value || 0), 0);
    
    if (currentSum === target) {
      const newGrid = grid.map(row => [...row]);
      selected.forEach(s => {
        newGrid[s.r][s.c] = null;
      });

      for (let c = 0; c < GRID_WIDTH; c++) {
        let emptyRow = GRID_HEIGHT - 1;
        for (let r = GRID_HEIGHT - 1; r >= 0; r--) {
          if (newGrid[r][c] !== null) {
            const temp = newGrid[r][c];
            newGrid[r][c] = null;
            newGrid[emptyRow][c] = temp;
            emptyRow--;
          }
        }
      }

      setScore(prev => prev + selected.length * 10);
      setSelected([]);
      setTarget(generateTarget());
      
      if (mode === GameMode.CLASSIC) {
        setGrid(addRow(newGrid));
      } else {
        setGrid(newGrid);
        setTimeLeft(TIME_LIMIT);
      }
    } else if (currentSum > target) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setSelected([]);
      }, 400);
    }
  }, [selected, grid, target, mode, addRow, generateTarget]);

  useEffect(() => {
    if (selected.length > 0) {
      checkSum();
    }
  }, [selected, checkSum]);

  useEffect(() => {
    if (mode === GameMode.TIME && !isGameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGrid(g => addRow(g));
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, isGameOver, isPaused, addRow]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  // --- Render Helpers ---
  if (!mode) {
    return (
      <div className="fixed inset-0 bg-paper flex items-center justify-center p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {coverStep === 0 ? (
            <motion.div 
              key="cover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-4xl w-full bg-white ancient-border shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden h-[90vh] md:h-auto"
            >
              {/* Image Section */}
              <div className="w-full md:w-1/2 h-64 md:h-[600px] bg-paper/50 relative overflow-hidden">
                {isLoadingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-gold border-t-vermilion rounded-full animate-spin" />
                    <p className="font-elegant text-vermilion animate-pulse">正在绘制丹青...</p>
                  </div>
                ) : coverImageUrl ? (
                  <motion.img 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={coverImageUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-paper">
                    <Sparkles className="text-gold w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-white" />
              </div>

              {/* Text Section */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center items-center text-center">
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                >
                  <h1 className="text-4xl md:text-6xl font-ancient text-vermilion mb-4 tracking-[0.2em]">
                    诺大宝和胡二苗
                  </h1>
                  <h2 className="text-2xl md:text-4xl font-elegant text-ink opacity-80 mb-8">
                    数字消除游戏
                  </h2>
                </motion.div>
                
                <button 
                  onClick={() => setCoverStep(1)}
                  className="px-12 py-4 bg-vermilion text-paper font-elegant font-bold text-xl hover:scale-105 transition-transform shadow-xl rounded-full flex items-center gap-3 group"
                >
                  开启试炼 <Play className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-12 text-[10px] uppercase tracking-[0.3em] text-ink/30 font-elegant">
                  诺大宝 & 胡二苗 联合出品
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="rules"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="max-w-2xl w-full bg-white ancient-border p-6 md:p-10 shadow-2xl relative z-10 max-h-[95vh] overflow-y-auto"
            >
              <button 
                onClick={() => setCoverStep(0)}
                className="absolute top-4 left-4 text-vermilion hover:scale-110 transition-transform"
              >
                <RotateCcw size={24} />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-3xl font-ancient text-vermilion mb-2">江湖规矩</h3>
                <div className="h-0.5 w-16 bg-gold mx-auto" />
              </div>

              <div className="grid gap-8">
                {/* Rules */}
                <div className="bg-paper/50 p-6 border border-gold/20 rounded-lg">
                  <ul className="text-sm md:text-base space-y-4 text-ink/80 leading-relaxed font-elegant">
                    <li className="flex gap-3">
                      <span className="bg-vermilion text-paper w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">1</span>
                      点击数字，使其相加等于顶部的“目标总和”。
                    </li>
                    <li className="flex gap-3">
                      <span className="bg-vermilion text-paper w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">2</span>
                      数字可跨行跨列任意组合。若总和超过目标，选择将自动重置。
                    </li>
                    <li className="flex gap-3">
                      <span className="bg-vermilion text-paper w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">3</span>
                      消除方块可获积分。切记！莫让方块堆积至顶部“危险区域”。
                    </li>
                    <li className="flex gap-3">
                      <span className="bg-vermilion text-paper w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">4</span>
                      经典试炼：每次成功后新增一行；计时试炼：每15秒强制新增一行。
                    </li>
                  </ul>
                </div>

                {/* Modes Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => startGame(GameMode.CLASSIC)}
                    className="group flex flex-col items-center gap-3 p-6 border-2 border-gold/30 hover:border-vermilion hover:bg-vermilion hover:text-paper transition-all rounded-xl bg-paper/30"
                  >
                    <Sword className="w-8 h-8 group-hover:scale-125 transition-transform" />
                    <div className="font-elegant font-bold text-lg">经典试炼</div>
                  </button>

                  <button 
                    onClick={() => startGame(GameMode.TIME)}
                    className="group flex flex-col items-center gap-3 p-6 border-2 border-gold/30 hover:border-jade hover:bg-jade hover:text-paper transition-all rounded-xl bg-paper/30"
                  >
                    <Timer className="w-8 h-8 group-hover:scale-125 transition-transform" />
                    <div className="font-elegant font-bold text-lg">计时试炼</div>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gold/20 flex justify-center items-center gap-4">
                <Trophy className="text-gold w-5 h-5" />
                <span className="font-elegant text-ink/60">最高战绩：{highScore}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-paper flex flex-col items-center p-2 md:p-4 font-sans text-ink overflow-hidden">
      {/* 统一宽度的游戏主容器 */}
      <div className="w-full max-w-md h-full flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex flex-col gap-2 md:gap-4 mb-2 md:mb-6 shrink-0">
          <div className="flex justify-between items-end">
            <div className="relative">
              <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-vermilion font-bold mb-0.5">目标总和</div>
              <div className="flex items-baseline gap-2 md:gap-3">
                <div className="text-5xl md:text-7xl font-ancient text-vermilion leading-none drop-shadow-sm">{target}</div>
                {selected.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-lg md:text-xl font-elegant text-jade font-bold"
                  >
                    ({selected.reduce((acc, s) => acc + (grid[s.r][s.c]?.value || 0), 0)})
                  </motion.div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-ink opacity-50 mb-0.5">积分</div>
              <div className="text-2xl md:text-4xl font-elegant font-bold text-ink">{score}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 bg-white ancient-border p-2 md:p-3 shadow-lg w-full">
            <div className="flex-1 flex items-center gap-2">
              {mode === GameMode.TIME ? (
                <>
                  <Timer className="w-3 h-3 md:w-4 md:h-4 text-vermilion" />
                  <div className="flex-1 h-1 md:h-1.5 bg-paper rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-vermilion"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                  <span className="text-[10px] md:text-xs font-bold w-6 md:w-8 text-vermilion">{timeLeft}s</span>
                </>
              ) : (
                <>
                  <Scroll className="w-3 h-3 md:w-4 md:h-4 text-vermilion" />
                  <span className="text-[10px] md:text-xs font-elegant font-bold text-vermilion tracking-widest">经典试炼</span>
                </>
              )}
            </div>
            <div className="h-3 md:h-4 w-[1px] bg-gold/30" />
            <button onClick={() => setIsPaused(!isPaused)} className="text-ink hover:text-vermilion transition-colors">
              {isPaused ? <Play className="w-4 h-4 md:w-5 md:h-5" /> : <Pause className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <button onClick={() => setMode(null)} className="text-ink hover:text-vermilion transition-colors">
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0 pb-4">
          <motion.div 
            animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative bg-white ancient-border p-2 md:p-4 shadow-2xl w-full h-full max-h-[75vh] flex flex-col"
          >
            <div 
              className="grid gap-1 md:gap-2 h-full w-full"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_HEIGHT}, minmax(0, 1fr))`
              }}
            >
              {grid.map((row, r) => (
                row.map((block, c) => {
                  const isSelected = selected.some(s => s.r === r && s.c === c);
                  return (
                    <div 
                      key={`${r}-${c}`}
                      className="relative border border-gold/10 rounded-md overflow-hidden"
                    >
                      <AnimatePresence mode="popLayout">
                        {block && (
                          <motion.button
                            layoutId={block.id}
                            initial={block.isNew ? { scale: 0, opacity: 0, rotate: -10 } : false}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0, rotate: 10 }}
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleBlockClick(r, c)}
                            className={`
                              w-full h-full flex items-center justify-center text-2xl md:text-4xl font-ancient leading-none transition-all rounded-md shadow-lg
                              ${isSelected 
                                ? 'bg-vermilion text-paper shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] scale-95 z-10 ring-4 ring-gold' 
                                : `block-vibrant-${block.value} border-b-8 border-black/30`
                              }
                              ${r < 1 ? 'after:content-[""] after:absolute after:inset-0 after:bg-vermilion/20 after:pointer-events-none' : ''}
                            `}
                          >
                            <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] filter brightness-110 select-none transform translate-y-1">{block.value}</span>
                            {isSelected && (
                              <motion.div 
                                layoutId="selection-ring"
                                className="absolute inset-0 border-2 border-gold pointer-events-none rounded-md"
                              />
                            )}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ))}
            </div>

            {/* Danger Line */}
            <div className="absolute top-[16.6%] left-0 right-0 border-t-4 border-dashed border-vermilion/40 pointer-events-none flex justify-center">
              <span className="bg-white px-4 text-xs text-vermilion -translate-y-1/2 font-elegant font-bold tracking-[0.4em] opacity-90 shadow-sm border border-vermilion/20 rounded-full">危险区域</span>
            </div>

            {/* Overlays */}
            <AnimatePresence>
              {isPaused && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-paper/95 backdrop-blur-sm flex items-center justify-center z-20"
                >
                  <div className="text-center">
                    <Pause className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-vermilion" />
                    <h2 className="text-2xl md:text-3xl font-ancient text-vermilion mb-4 md:mb-6">暂避锋芒</h2>
                    <button 
                      onClick={() => setIsPaused(false)}
                      className="px-8 md:px-10 py-2 md:py-3 bg-vermilion text-paper font-elegant font-bold hover:opacity-90 shadow-lg rounded-full"
                    >
                      继续挑战
                    </button>
                  </div>
                </motion.div>
              )}

              {isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-ink/95 text-paper flex items-center justify-center z-30 p-4 md:p-8"
                >
                  <div className="text-center w-full">
                    <AlertCircle className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-8 text-vermilion" />
                    <h2 className="text-3xl md:text-5xl font-ancient text-vermilion mb-2 md:mb-4">挑战终结</h2>
                    <div className="mb-6 md:mb-10 opacity-80 font-elegant">
                      <p className="text-lg md:text-xl">最终积分: {score}</p>
                      {score >= highScore && score > 0 && (
                        <motion.p 
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-gold font-bold mt-2 md:mt-4 text-xl md:text-2xl"
                        >
                          刷新武林纪录！
                        </motion.p>
                      )}
                    </div>
                    <div className="space-y-3 md:space-y-4 w-full max-w-[200px] md:max-w-xs mx-auto">
                      <button 
                        onClick={() => startGame(mode!)}
                        className="w-full py-3 md:py-4 bg-vermilion text-paper font-elegant font-bold hover:bg-vermilion/80 shadow-xl rounded-full"
                      >
                        卷土重来
                      </button>
                      <button 
                        onClick={() => setMode(null)}
                        className="w-full py-3 md:py-4 border-2 border-gold text-gold font-elegant font-bold hover:bg-gold/10 rounded-full"
                      >
                        归隐山林
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto pb-2 w-full flex justify-between items-center text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-ink/40 font-elegant shrink-0">
          <div className="flex items-center gap-1 md:gap-2">
            <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span>守卫顶端</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span>诺大宝 & 胡二苗</span>
          </div>
        </div>
      </div>
    </div>
  );
}
