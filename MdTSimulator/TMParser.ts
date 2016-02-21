namespace TuringMachine.Parser {
    class TMParserException {
        private static serialVersionUID: number = 1;

        msg: string;

        line: number;

        constructor(msg: string, line: number) {
            this.msg = msg;
            this.line = line;
        }
    }

    var ParserMsgMgr = {
        MISSING_START_SYMBOL: "Errore nella lettura del primo simbolo!",
        INVALID_START_SYMBOL: "I simboli nella premessa hanno un formato errato!",
        MISSING_START_STATE: "Errore nella lettura dello stato di partenza",
        INVALID_START_STATE: "I simboli tra [] nello stato della premessa hanno un formato errato!",
        MISSING_DEST_STATE: "Errore nella lettura dello stato di destinazione",
        INVALID_DEST_STATE: "I simboli tra [] nello stato di destinazione hanno un formato errato!",
        MISSING_DEST_SYMBOL: "Errore nella lettura del simbolo da scrivere",
        INVALID_DEST_SYMBOL: "Errore nella lettura dei simboli di destinazione",
        MISSING_DEST_MOVE: "Errore nella lettura del movimento da eseguire",
        INVALID_DEST_MOVE: "Lo spostamento è scorretto!",
        TOO_MUCH_DATA: "Ci sono più di cinque parametri!",
        UNEXPECTED_EOF: "Fine inattesa della regola",
        IO_ERROR: "Errore di lettura dallo stream",
        CHAR_CLASS_INCOMPLETE: "Le classi di caratteri nella regola hanno lunghezze differenti!",
        MISSING_COMMA: "Era attesa la ',' come separatore",
        MISSING_CLOSING_RULE: "Era attesa ')' a chiusura della regola"
    }

    var ParserSymbols = {
        Braces: "[]{}",
        Alphabet: " !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^-{|}",
        Quote: '\\',
        SpaceMrk: '-',
        Dirs: "<>-",
        Not: '^',
        CharClassDash: '.',
        CharClassDashCount: 2,
        LeftDir: '<',
        RightDir: '>'
    };

    class CharClass {
        data: string;
        pos: number;
        len: number;
        bracetype: number;
        negate: boolean;

        constructor() {
            this.invalidate();
        }

        invalidate() : void {
            this.len = this.pos = this.bracetype = -1;
            this.data = null;
            this.negate = false;
        }
  
        isValid() : boolean {
            return this.data != null;
        }

        eof() : boolean {
            return this.pos == (this.negate ? ParserSymbols.Alphabet.length : this.data.length);
        }
  
        braceType() : number {
            return this.bracetype;
        }
  
        advance() : boolean {
            if (this.negate) {
                if (this.pos == ParserSymbols.Alphabet.length)
                    return false;
                do
                    this.pos++;
                while (this.pos < ParserSymbols.Alphabet.length && this.data.indexOf(ParserSymbols.Alphabet.charAt(this.pos)) != -1);
                if (this.pos == ParserSymbols.Alphabet.length)
                    return false;
                return true;
            }
            if (this.pos == this.data.length)
                return false;
            if (this.data.charAt(this.pos) == ParserSymbols.Quote) this.pos++;
            this.pos++;
            return true;
        }
  
        setBounds(d: string, s: number, e: number) : void {
            this.len = 0;

            var b = s;
            var sb = new Array<string>();
            this.bracetype = ParserSymbols.Braces.indexOf(d.charAt(s));
            if (this.bracetype == -1)
                this.bracetype = ParserSymbols.Braces.length;
            else {
                s++;
                e--;
            }
            if (d.charAt(s) == ParserSymbols.Not) {
                s++;
                this.negate = true;
            } else
                this.negate = false;
            b = s;
            while (s < e) {
                var c = d.charAt(s);
                switch (c) {
                    case ParserSymbols.CharClassDash:
                        if (b == s || s + ParserSymbols.CharClassDashCount >= e) { // Consider it as char
                            sb.push(c);
                            this.len++;
                            s++;
                            break;
                        }
                        // Look for a sequence of CharClassDashCount
                        for (var i = 1; i < ParserSymbols.CharClassDashCount; i++)
                        if (ParserSymbols.CharClassDash != d.charAt(s + i)) {
                            sb.push(c);
                            this.len++;
                            s++;
                            c = null; // Here c should be CharClassDash so I can use c
                            break;
                        }
                        if (c == null)
                            break;
                        // + 1 => begin already added
                        var idxs = ParserSymbols.Alphabet.indexOf(d.charAt(s - 1)) + 1;
                        var idxe = d.charAt(s + ParserSymbols.CharClassDashCount) == ParserSymbols.Quote ?
                            ParserSymbols.Alphabet.indexOf(d.charAt(s + ParserSymbols.CharClassDashCount + 1)) :
                            ParserSymbols.Alphabet.indexOf(d.charAt(s + ParserSymbols.CharClassDashCount));
                        if (idxe < idxs) {
                            s += ParserSymbols.CharClassDashCount + (d.charAt(s + ParserSymbols.CharClassDashCount) == ParserSymbols.Quote ? 2 : 1);
                            break;
                        }

                        for (var i = idxs; i <= idxe; i++) {
                            c = ParserSymbols.Alphabet.charAt(i);
                            if (c == ParserSymbols.SpaceMrk)
                                sb.push(ParserSymbols.Quote);
                            sb.push(c);
                            this.len++;
                        }
                        s += ParserSymbols.CharClassDashCount + 1;
                        break;
                    case ParserSymbols.Quote:
                        sb.push(c);
                        c = d.charAt(s + 1);
                        sb.push(c);
                        s += 2;
                        this.len++;
                        break;
                    default:
                        sb.push(c);
                        s++;
                        this.len++;
                        break;
                }
            }
            this.data = sb.join('');
            this.pos = 0;
            if (this.negate)
                this.len = ParserSymbols.Alphabet.length - this.len;
        }
  
        toString() : string {
            return "(data='" + this.data + "', pos=" + this.pos + ")";
        }
  
        reset() : void {
            this.pos = this.data == null ? -1 : 0;
        }
  
        length() : number {
            return this.len;
        }
  
        readSymbol() : string {
            if (this.negate)
                return ParserSymbols.Alphabet.charAt(this.pos);
            if (this.data.charAt(this.pos) == ParserSymbols.Quote)
                return this.data.charAt(this.pos + 1);
            if (this.data.charAt(this.pos) == ParserSymbols.SpaceMrk)
                return ' ';
            return this.data.charAt(this.pos);
        }

        readState() : string {
            if (this.negate)
                return ParserSymbols.Alphabet.charAt(this.pos);
            if (this.data.charAt(this.pos) == ParserSymbols.Quote)
                return this.data.charAt(this.pos + 1);
            return this.data.charAt(this.pos);
        }

        readDir() : string {
            if (this.negate)
                return ParserSymbols.Alphabet.charAt(this.pos);
            if (this.data.charAt(this.pos) == ParserSymbols.Quote)
                return this.data.charAt(this.pos + 1);
            return this.data.charAt(this.pos);
        }
  
        static nextChar(line : string, pos : number) : string {
            if (line.charAt(pos) == ParserSymbols.Quote)
                return line.charAt(pos + 1);
            else if (line.charAt(pos) == ParserSymbols.SpaceMrk)
                return ' ';
            return line.charAt(pos);
        }
    }

    class Parser {
        private remark : string = "#";

        // Note: Do not use \ as brace!  
        private static Keys : string = "()," + ParserSymbols.Braces;

        private ignoreCase: boolean = true;

        private startStatePS: number;
        private startStatePE: number;
        private startStateSS: number;
        private startStateSE: number;
        private startSymbolS: number;
        private startSymbolE: number;
        private destStatePS: number;
        private destStatePE: number;
        private destStateSS: number;
        private destStateSE: number;
        private destSymbolS: number;
        private destSymbolE: number;
        private dirS: number;
        private dirE: number;
        private line: string;
        private lineno: number;
        private pos: number;
        private startStateCC: CharClass = new CharClass();
        private startSymbolCC: CharClass = new CharClass();
        private destStateCC: CharClass = new CharClass();
        private destSymbolCC: CharClass = new CharClass();
        private dirCC: CharClass = new CharClass();
        private charClasses: Array<CharClass> = new Array<CharClass>(this.startStateCC, this.startSymbolCC, this.destStateCC, this.destSymbolCC, this.dirCC);

        private isBlank() : boolean {
            return this.line.charAt(this.pos) == ' ' || this.line.charAt(this.pos) == '\t';
        }
  
        private skipBlanks() : void {
            while (!this.eof() && this.isBlank()) this.pos++;
        }
  
        private isKey() : boolean {
            return Parser.Keys.indexOf(this.line.charAt(this.pos)) != -1;
        }
  
        private eof() : boolean {
            return this.pos >= this.line.length;
        }
  
        private nextPos() : number {
            if (this.line.charAt(this.pos) == ParserSymbols.Quote)
                this.pos += 2;
            else
                this.pos++;

            return this.pos;
        }

        private match(c : string) : boolean {
            if (this.eof())
                return false;
            if (this.line.charAt(this.pos) != c)
                return false;
            this.nextPos();
            return true;
        }

        private matchBrace(i: number) : number {
            if (this.eof())
                return -1;
            var ret = (i == -1) ? ParserSymbols.Braces.indexOf(this.line.charAt(this.pos)) : i + 1;
            if (ret != -1 && this.line.charAt(this.pos) != ParserSymbols.Braces.charAt(ret))
                return -1;
            if (ret != -1)
                this.nextPos();
            return ret;
        }
  
        private parseState(start : boolean) : void {
            this.skipBlanks();

            var ps = this.pos, pe = -1, ss = -1, se = -1;

            while (!this.eof() && !this.isBlank() && !this.isKey()) this.nextPos();
            if (this.eof())
                throw new TMParserException(ParserMsgMgr.UNEXPECTED_EOF, this.lineno);

            pe = this.pos;

            var b = this.matchBrace(-1);
            if (b != -1) {
                while (!this.eof() && !this.isBlank() && !this.isKey()) this.nextPos();
                if (this.matchBrace(b) == -1)
                    throw new TMParserException(ParserMsgMgr.CHAR_CLASS_INCOMPLETE, this.lineno);

                ss = this.pos;

                while (!this.eof() && !this.isBlank() && !this.isKey()) this.nextPos();

                se = this.pos;
            }

            if ((ss == -1 && ps == pe) || (ss != -1 && ps == se))
                ps = pe = ss = se = -1;

            if (start) {
                this.startStatePS = ps;
                this.startStatePE = pe;
                this.startStateSS = ss;
                this.startStateSE = se;
            } else {
                this.destStatePS = ps;
                this.destStatePE = pe;
                this.destStateSS = ss;
                this.destStateSE = se;
            }
        }

        private parseSymbol(start: boolean) : void {
            this.skipBlanks();
            var begin = this.pos, end;

            var b = this.matchBrace(-1);

            while (!this.eof() && !this.isBlank() && !this.isKey()) this.nextPos();

            if (b != -1)
                if (this.matchBrace(b) == -1)
                    throw new TMParserException(ParserMsgMgr.CHAR_CLASS_INCOMPLETE, this.lineno);

            end = this.pos;
            if (begin == end)
                begin = end = -1;

            if (start) {
                this.startSymbolS = begin;
                this.startSymbolE = end;
            } else {
                this.destSymbolS = begin;
                this.destSymbolE = end;
            }
        }

        private parseDir() : void {
            this.skipBlanks();
            this.dirS = this.pos;
            var b = this.matchBrace(-1);
            while (!this.eof() && !this.isBlank() && !this.isKey()) this.nextPos();
            if (b != -1) {
                if (this.matchBrace(b) == -1)
                    throw new TMParserException(ParserMsgMgr.CHAR_CLASS_INCOMPLETE, this.lineno);
            }
            this.dirE = this.pos;
            if (this.dirS == this.dirE)
                this.dirS = this.dirE = -1;
        }

        private parseRule() : void {
            this.skipBlanks();
            var b = this.match('(');
            this.parseState(true);
            this.skipBlanks();
            if (!this.match(','))
                throw new TMParserException(ParserMsgMgr.MISSING_COMMA, this.lineno);
            this.parseSymbol(true);
            this.skipBlanks();
            if (!this.match(','))
            throw new TMParserException(ParserMsgMgr.MISSING_COMMA, this.lineno);
            this.parseState(false);
            this.skipBlanks();
            if (!this.match(','))
            throw new TMParserException(ParserMsgMgr.MISSING_COMMA, this.lineno);
            this.parseSymbol(false);
            this.skipBlanks();
            if (!this.match(','))
                throw new TMParserException(ParserMsgMgr.MISSING_COMMA, this.lineno);
            this.parseDir();
            this.skipBlanks();
            if (b && !this.match(')'))
                throw new TMParserException(ParserMsgMgr.MISSING_CLOSING_RULE, this.lineno);
        }
  
        private readString(l: string, s: number, e: number) : string {
            var sb = new Array<string>();
            while (s < e) {
              if (l.charAt(s) == ParserSymbols.Quote)
                s++;
              sb.push(l.charAt(s++));
            }
            return sb.join('');
        }

        parse(t: TuringMachine.TM, src: string): void {
            var sc = 0, ln = 0;
            var readLine = function () {
                if (sc >= src.length)
                    return null;

                var p = src.indexOf('\n', sc);
                var ret = null;
                if (p == -1) {
                    ret = src.substr(sc);
                    sc = src.length;
                } else {
                    ret = src.substr(sc, p - sc);
                    sc = p + 1;
                }
                ln++;
                return ret;
            };

            // Note we decided to define an alphabet and both character classes and not
            // refer to this alphabet (which accidentally is a subset of ASCII chars)
            try {
                while ((this.line = readLine()) != null) {
                    if (this.ignoreCase)
                        this.line = this.line.toUpperCase();

                    if (this.line.indexOf(this.remark) == 0 || this.line.trim() == '')
                        continue;
                    this.lineno = ln;
                    this.startStatePS = this.startStatePE = -1;
                    this.startStateSS = this.startStateSE = -1;
                    this.startSymbolS = this.startSymbolE = -1;
                    this.destStatePS = this.destStatePE = -1;
                    this.destStateSS = this.destStateSE = -1;
                    this.destSymbolS = this.destSymbolE = -1;
                    this.dirS = this.dirE = -1;
                    this.pos = 0;

                    this.parseRule();

                    if (this.startStatePS == -1 || this.startStatePE == -1)
                        throw new TMParserException(ParserMsgMgr.MISSING_START_STATE, this.lineno);
                    if (this.startStateSS != -1 && this.startStateSE == -1)
                        throw new TMParserException(ParserMsgMgr.UNEXPECTED_EOF, this.lineno);
                    if (this.startSymbolS == -1 || this.startSymbolE == -1)
                        throw new TMParserException(ParserMsgMgr.MISSING_START_SYMBOL, this.lineno);
                    if (this.destStatePS == -1 || this.destStatePE == -1)
                        throw new TMParserException(ParserMsgMgr.MISSING_DEST_STATE, this.lineno);
                    if (this.destSymbolS == -1 || this.destSymbolE == -1)
                        throw new TMParserException(ParserMsgMgr.MISSING_DEST_SYMBOL, this.lineno);
                    if (this.destStateSS != -1 && this.destStateSE == -1)
                        throw new TMParserException(ParserMsgMgr.UNEXPECTED_EOF, this.lineno);
                    if (this.dirS == -1 || this.dirE == -1)
                        throw new TMParserException(ParserMsgMgr.MISSING_DEST_MOVE, this.lineno);

                    //Integer ln = new Integer(lineno);

                    var startStatePfx = this.readString(this.line, this.startStatePS, this.startStatePE);
                    var startStateSfx = null;
                    var destStatePfx = this.readString(this.line, this.destStatePS, this.destStatePE);
                    var destStateSfx = null;

                    if (this.startStateSS != -1)
                        startStateSfx = this.readString(this.line, this.startStateSS, this.startStateSE);
                    if (this.destStateSS != -1)
                        destStateSfx = this.readString(this.line, this.destStateSS, this.destStateSE);

                    if (this.startStateSS == -1)
                        this.startStateCC.invalidate();
                    else
                        this.startStateCC.setBounds(this.line, this.startStatePE, this.startStateSS);

                    if (this.destStateSS == -1)
                        this.destStateCC.invalidate();
                    else
                        this.destStateCC.setBounds(this.line, this.destStatePE, this.destStateSS);

                    this.startSymbolCC.setBounds(this.line, this.startSymbolS, this.startSymbolE);
                    this.destSymbolCC.setBounds(this.line, this.destSymbolS, this.destSymbolE);
                    this.dirCC.setBounds(this.line, this.dirS, this.dirE);

                    for (var i = 0; i < this.charClasses.length; i++)
                        for (var j = 0; j < this.charClasses.length; j++) {
                            if (i != j &&
                                this.charClasses[i].isValid() && this.charClasses[j].isValid() &&
                                this.charClasses[i].braceType() == this.charClasses[j].braceType() &&
                                this.charClasses[i].length() != 1 &&
                                this.charClasses[j].length() != 1 &&
                                this.charClasses[i].length() != this.charClasses[j].length())
                                throw new TMParserException(ParserMsgMgr.CHAR_CLASS_INCOMPLETE, this.lineno);
                        }

                    for (; ;) {
                        // Generate the rule
                        var startState = startStateSfx == null ? startStatePfx : startStatePfx + this.startStateCC.readState() + startStateSfx;
                        var startSymbol = this.startSymbolCC.readSymbol();
                        var destState = destStateSfx == null ? destStatePfx : destStatePfx + this.destStateCC.readState() + destStateSfx;
                        var destSymbol = this.destSymbolCC.readSymbol();
                        var dir = this.dirCC.readDir();

                        if (ParserSymbols.Dirs.indexOf(dir) == -1)
                            throw new TMParserException(ParserMsgMgr.INVALID_DEST_MOVE, this.lineno);

                        //System.out.println("(" + startState + ", " + (startSymbol == ' '? TM.BLANK:startSymbol) + ", " + destState + ", " + (destSymbol == ' '?TM.BLANK:destSymbol) + ", " + dir + ")");

                        t.addRule(startState,
                            startSymbol == ' ' ? Symbols.BLANK : startSymbol,
                            destState,
                            destSymbol == ' ' ? Symbols.BLANK : destSymbol,
                            dir == ParserSymbols.LeftDir ? Symbols.LEFT :
                                dir == ParserSymbols.RightDir ? Symbols.RIGHT :
                                Symbols.STAY,
                            ln);

                        if (!this.advanceRoot())
                            break;
                    }
                }
            } catch (e) {
                throw new TMParserException(ParserMsgMgr.IO_ERROR, this.lineno);
            }
        }
 
        private advance(lvl: number) : boolean {
            var ret = false;
            for (var i = 0; i < this.charClasses.length; i++)
                if (this.charClasses[i].braceType() == lvl && this.charClasses[i].length() > 1 && !this.charClasses[i].eof()) {
                    this.charClasses[i].advance();
                    if (!this.charClasses[i].eof())
                        ret = true;
                }
            return ret;
        }
  
        private checkLevel(lvl: number) : boolean {
            for (var i = 0; i < this.charClasses.length; i++)
            if (this.charClasses[i].length() > 1 && this.charClasses[i].braceType() == lvl && !this.charClasses[i].eof())
                return true;
            return false;
        }
  
        private resetLevel(lvl: number) : void {
            for (var i = 0; i < this.charClasses.length; i++)
                if (this.charClasses[i].length() > 1 && this.charClasses[i].braceType() == lvl && this.charClasses[i].eof())
                    this.charClasses[i].reset();
        }
  
        private advanceRoot() : boolean {
            var lvl = 0;
            // Find the candidate
            for (; lvl <= ParserSymbols.Braces.length; lvl += 2)
                if (this.checkLevel(lvl))
                    break;
            if (lvl > ParserSymbols.Braces.length)
                return false;

            while (lvl <= ParserSymbols.Braces.length && !this.advance(lvl))
                lvl += 2;

            if (lvl > ParserSymbols.Braces.length)
                return false;

            for (var i = 0; i < lvl; i += 2)
                this.resetLevel(i);

            return true;
        }
  
        constructor() {
        }
    }
}
