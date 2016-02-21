namespace TuringMachine {
    export var Symbols = {
        STAY: '-',
        RIGHT: '>',
        LEFT: '<',
        BLANK: ' ',
        INFINITY: -1
    }

    export interface TMParser {
      parse(t: TM, src: string) : void;
    }

    export interface TMListener {
        tmstart(tm: TM) : void;
        tmstop(tm: TM) : void;
        tmstep(tm: TM) : void;
    }

    export class TM {
        private program: Object;
        private debug: Object;
        private currState: string;
        private exit: boolean;
        private currDir: string;
        private lastDir: string;
        private lastRulePrecondition: string;

        tape: Array<string>;
        pos: number;
        listeners: Array<TMListener>;
        steps: number;
        limit: number;

        constructor() {
            this.program = {};
            this.debug = {};
            this.currState = "0";
            this.tape = new Array<string>();
            this.pos = 0;
            this.listeners = new Array<TMListener>();
            this.steps = 0;
            this.lastDir = this.currDir = Symbols.STAY;
            this.limit = Symbols.INFINITY;
        }

        addTMListener(l: TMListener): void {
            if (this.listeners.indexOf(l) != -1)
                this.listeners.push(l);
        }

        addRule(inState: string, inSym: string, outState: string,
            outSym: string, dir: string, dbginfo: Object) : void {
            this.program[inState + inSym] = outState + outSym + dir;
            this.debug[inState + inSym] = dbginfo;
        }

        private resetTape() : void {
            this.tape = new Array<string>();
        }

        clearTape() : void {
            this.resetTape();
            this.tape.push(' ');
        }

        setTape(content: string): void {
            this.resetTape();
            for (var i = 0; i < content.length; i++)
                this.tape.push(content.charAt(i));
        }

        getTape(width: number): string {
            var start = this.pos - (width / 2);
            var ret = '';

            while (start < 0) {
                ret += ' ';
                ++start;
            }

            while ((ret.length < width) && (start < this.tape.length))
                ret += this.tape[start++];

            while (ret.length < width)
                ret += ' ';

            return ret;
        }

        getFullTape() : string {
            return this.tape.join('');
        }

        getState(): string {
            return this.currState;
        }

        private dispatchTMStart(): void {
            for (var i = 0; i < this.listeners.length; i++)
                this.listeners[i].tmstart(this);
        }

        private dispatchTMStep(): void {
            for (var i = 0; i < this.listeners.length; i++)
                this.listeners[i].tmstep(this);
            this.lastDir = this.currDir;
        }

        private dispatchTMStop(): void {
            for (var i = 0; i < this.listeners.length; i++)
                this.listeners[i].tmstop(this);
        }

        run(): void {
            this.exit = false;

            this.dispatchTMStart();

            while (!this.exit && ((this.limit == Symbols.INFINITY) || (this.steps <= this.limit)) && this.makeStep())
                this.dispatchTMStep();

            this.dispatchTMStop();
        }

        stop() : void {
            this.exit = true;
        }

        makeStep(): boolean {
            this.lastRulePrecondition = this.currState + this.tape[this.pos];
            var action : string = this.program[this.lastRulePrecondition];

            if (action != null) {
                this.doAction(action);
                return true;
            }

            return false;
        }

        moveTape(dir: string) : void {
            switch (dir) {
            case Symbols.RIGHT:
                ++this.pos;
                if (this.pos == this.tape.length)
                    this.tape.push(Symbols.BLANK);
                break;
            case Symbols.LEFT:
                if (this.pos == 0)
                    this.tape = (new Array<string>(Symbols.BLANK)).concat(this.tape);
                else
                    --this.pos;
                break;
            }
        }

        private doAction(act: string): void {
            var state   = act.substring(0, act.length - 2);
            var outSym  = act.charAt(act.length - 2);
            var dir     = act.charAt(act.length - 1);

            this.currDir = dir;

            ++this.steps;
            this.currState = state;
            this.tape[this.pos] = outSym;

            this.moveTape(dir);
        }

        getLastDir() : string {
            return this.lastDir;
        }

        getSteps() : number {
            return this.steps;
        }

        getDebug() : Object {
            return this.debug[this.lastRulePrecondition];
        }

        setLimit(st : number) : void {
            if (st > 0) this.limit = st;
        }

        isNoRuleStop() : boolean {
            return this.steps > this.limit;
        }
    }
}
