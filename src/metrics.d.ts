interface Window { joyMetrics?: Record<string, number>; }
interface Window { joyTracking?: {detected:number[][];projected:number[][];targetProjected:number[][];normal:number[];processingWidth:number;processingHeight:number;bounds?:{min:number[];max:number[]}}; }
