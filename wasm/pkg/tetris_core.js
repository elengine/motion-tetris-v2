/* @ts-self-types="./tetris_core.d.ts" */

export class Game {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GameFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_game_free(ptr, 0);
    }
    /**
     * テスト/デバッグ用: 盤面1セルを文字で返す ('.' で空). wasm公開対象外
     * @param {number} x
     * @param {number} y
     * @returns {string}
     */
    cell_char(x, y) {
        const ret = wasm.game_cell_char(this.__wbg_ptr, x, y);
        return String.fromCodePoint(ret);
    }
    /**
     * @returns {number}
     */
    get combo() {
        const ret = wasm.game_combo(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get curRot() {
        const ret = wasm.game_curRot(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get curX() {
        const ret = wasm.game_curX(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get curY() {
        const ret = wasm.game_curY(this.__wbg_ptr);
        return ret;
    }
    /**
     * テスト用: 現在ピースtype_pub
     * @returns {PieceType | undefined}
     */
    cur_type() {
        const ret = wasm.game_cur_type(this.__wbg_ptr);
        return ret === 7 ? undefined : ret;
    }
    /**
     * @returns {any}
     */
    currentCells() {
        const ret = wasm.game_currentCells(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {PieceType | undefined}
     */
    currentPiece() {
        const ret = wasm.game_currentPiece(this.__wbg_ptr);
        return ret === 7 ? undefined : ret;
    }
    /**
     * @returns {boolean}
     */
    do_hold() {
        const ret = wasm.game_do_hold(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string[]}
     */
    drainActions() {
        const ret = wasm.game_drainActions(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {bigint}
     */
    get elapsedMs() {
        const ret = wasm.game_elapsedMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {any}
     */
    getCurrent() {
        const ret = wasm.game_getCurrent(this.__wbg_ptr);
        return ret;
    }
    /**
     * 盤面を文字列で返す（"I..T..." × 22行）
     * @returns {string}
     */
    getGrid() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.game_getGrid(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    getHold() {
        const ret = wasm.game_getHold(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {any}
     */
    getQueue() {
        const ret = wasm.game_getQueue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @returns {PieceType | undefined}
     */
    get_cell(x, y) {
        const ret = wasm.game_get_cell(this.__wbg_ptr, x, y);
        return ret === 7 ? undefined : ret;
    }
    /**
     * @returns {number}
     */
    get ghostY() {
        const ret = wasm.game_ghostY(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    ghost_y_internal() {
        const ret = wasm.game_ghost_y_internal(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    grounded() {
        const ret = wasm.game_grounded(this.__wbg_ptr);
        return ret !== 0;
    }
    hard_drop() {
        wasm.game_hard_drop(this.__wbg_ptr);
    }
    /**
     * @returns {string[]}
     */
    lastActions() {
        const ret = wasm.game_lastActions(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get level() {
        const ret = wasm.game_level(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get lines() {
        const ret = wasm.game_lines(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} dx
     * @returns {boolean}
     */
    move_h(dx) {
        const ret = wasm.game_move_h(this.__wbg_ptr, dx);
        return ret !== 0;
    }
    /**
     * @param {bigint} seed
     */
    constructor(seed) {
        const ret = wasm.game_new(seed);
        this.__wbg_ptr = ret;
        GameFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    pause_toggle() {
        wasm.game_pause_toggle(this.__wbg_ptr);
    }
    /**
     * 未読イベントをすべて取り出す（フロント演出用）
     * @returns {any}
     */
    popEvents() {
        const ret = wasm.game_popEvents(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} dir
     * @returns {boolean}
     */
    rotate(dir) {
        const ret = wasm.game_rotate(this.__wbg_ptr, dir);
        return ret !== 0;
    }
    /**
     * @returns {bigint}
     */
    get score() {
        const ret = wasm.game_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {PieceType | null} [v]
     */
    set_cell(x, y, v) {
        wasm.game_set_cell(this.__wbg_ptr, x, y, isLikeNone(v) ? 7 : v);
    }
    /**
     * @returns {boolean}
     */
    soft_drop() {
        const ret = wasm.game_soft_drop(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {GameMode} mode
     * @param {bigint} seed
     */
    startGame(mode, seed) {
        wasm.game_startGame(this.__wbg_ptr, mode, seed);
    }
    /**
     * @param {number} dt
     */
    tick(dt) {
        wasm.game_tick(this.__wbg_ptr, dt);
    }
    /**
     * @returns {boolean}
     */
    get finished() {
        const ret = wasm.__wbg_get_game_finished(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {GameMode}
     */
    get mode() {
        const ret = wasm.__wbg_get_game_mode(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {GameState}
     */
    get state() {
        const ret = wasm.__wbg_get_game_state(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {boolean} arg0
     */
    set finished(arg0) {
        wasm.__wbg_set_game_finished(this.__wbg_ptr, arg0);
    }
    /**
     * @param {GameMode} arg0
     */
    set mode(arg0) {
        wasm.__wbg_set_game_mode(this.__wbg_ptr, arg0);
    }
    /**
     * @param {GameState} arg0
     */
    set state(arg0) {
        wasm.__wbg_set_game_state(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) Game.prototype[Symbol.dispose] = Game.prototype.free;

/**
 * @enum {0 | 1 | 2}
 */
export const GameMode = Object.freeze({
    Marathon: 0, "0": "Marathon",
    Sprint: 1, "1": "Sprint",
    Ultra: 2, "2": "Ultra",
});

/**
 * @enum {0 | 1 | 2 | 3}
 */
export const GameState = Object.freeze({
    Title: 0, "0": "Title",
    Playing: 1, "1": "Playing",
    Paused: 2, "2": "Paused",
    GameOver: 3, "3": "GameOver",
});

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6}
 */
export const PieceType = Object.freeze({
    I: 0, "0": "I",
    O: 1, "1": "O",
    T: 2, "2": "T",
    S: 3, "3": "S",
    Z: 4, "4": "Z",
    J: 5, "5": "J",
    L: 6, "6": "L",
});
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_67e7344beaa85059: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_debug_string_0e68cf47c9cbd9b0: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_5d9e815e6fdf150f: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_bebc3f4757acf305: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_ffa92086ea89f79c: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_set_13d25b81ab403f5e: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbindgen_generic_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./tetris_core_bg.js": import0,
    };
}

const GameFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_game_free(ptr, 1));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('tetris_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
