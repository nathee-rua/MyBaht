'use client';

import React, { useState, useEffect } from 'react';
import { Delete, Equal, RefreshCw, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CalculatorKeypadProps {
  onValueChange: (value: number) => void;
  onSave: () => void;
  onReset: () => void;
  initialValue?: number;
}

export default function CalculatorKeypad({
  onValueChange,
  onSave,
  onReset,
  initialValue = 0,
}: CalculatorKeypadProps) {
  const { t } = useI18n();
  const [display, setDisplay] = useState(initialValue > 0 ? initialValue.toString() : '0');
  const [expression, setExpression] = useState('');

  useEffect(() => {
    const val = parseFloat(display) || 0;
    onValueChange(val);
  }, [display, onValueChange]);

  const handleNum = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleOperator = (op: string) => {
    setExpression(`${display} ${op} `);
    setDisplay('0');
  };

  const handleEqual = () => {
    if (!expression) return;
    
    const parts = expression.trim().split(' ');
    if (parts.length < 2) return;

    const val1 = parseFloat(parts[0]);
    const op = parts[1];
    const val2 = parseFloat(display);

    let result = 0;
    switch (op) {
      case '+':
        result = val1 + val2;
        break;
      case '-':
        result = val1 - val2;
        break;
      case '×':
      case '*':
        result = val1 * val2;
        break;
      case '÷':
      case '/':
        result = val2 !== 0 ? val1 / val2 : 0;
        break;
    }

    // Round to 2 decimal places max
    result = Math.round(result * 100) / 100;
    setDisplay(result.toString());
    setExpression('');
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    onReset();
  };

  return (
    <div className="flex flex-col gap-2 mt-auto pt-3 pb-3 px-4 bg-secondary/80 border-t border-border/40">
      {/* Expression / Display preview */}
      <div className="flex flex-col items-end px-3 py-0.5 font-mono">
        <span className="text-[10px] text-text-muted h-3.5 leading-none">{expression}</span>
        <span className="text-xl font-bold text-accent-purple-light leading-none">{display}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Row 1: C, Backspace, =, / */}
        <button onClick={handleClear} className="calc-key calc-key-reset flex items-center justify-center">
          <RefreshCw size={16} />
        </button>
        <button onClick={handleBackspace} className="calc-key calc-key-number flex items-center justify-center text-text-secondary">
          <Delete size={18} />
        </button>
        <button onClick={handleEqual} className="calc-key calc-key-operator flex items-center justify-center">
          <Equal size={18} />
        </button>
        <button onClick={() => handleOperator('÷')} className="calc-key calc-key-operator">÷</button>

        {/* Row 2: 7, 8, 9, * */}
        <button onClick={() => handleNum('7')} className="calc-key calc-key-number">7</button>
        <button onClick={() => handleNum('8')} className="calc-key calc-key-number">8</button>
        <button onClick={() => handleNum('9')} className="calc-key calc-key-number">9</button>
        <button onClick={() => handleOperator('×')} className="calc-key calc-key-operator">×</button>

        {/* Row 3: 4, 5, 6, - */}
        <button onClick={() => handleNum('4')} className="calc-key calc-key-number">4</button>
        <button onClick={() => handleNum('5')} className="calc-key calc-key-number">5</button>
        <button onClick={() => handleNum('6')} className="calc-key calc-key-number">6</button>
        <button onClick={() => handleOperator('-')} className="calc-key calc-key-operator">-</button>

        {/* Row 4: 1, 2, 3, + */}
        <button onClick={() => handleNum('1')} className="calc-key calc-key-number">1</button>
        <button onClick={() => handleNum('2')} className="calc-key calc-key-number">2</button>
        <button onClick={() => handleNum('3')} className="calc-key calc-key-number">3</button>
        <button onClick={() => handleOperator('+')} className="calc-key calc-key-operator">+</button>

        {/* Row 5: 0 (col-span-2), . (col-span-1), Save (col-span-1) */}
        <button onClick={() => handleNum('0')} className="calc-key calc-key-number col-span-2">0</button>
        <button onClick={handleDecimal} className="calc-key calc-key-number">.</button>
        <button onClick={onSave} className="calc-key calc-key-save col-span-1 flex items-center justify-center">
          <Check size={20} />
        </button>
      </div>
    </div>
  );
}
