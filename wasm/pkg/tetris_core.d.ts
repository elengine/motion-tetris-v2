/* tslint:disable */
/* eslint-disable */

export class Game {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * テスト/デバッグ用: 盤面1セルを文字で返す ('.' で空). wasm公開対象外
     */
    cell_char(x: number, y: number): string;
    /**
     * テスト用: 現在ピースtype_pub
     */
    cur_type(): PieceType | undefined;
    currentCells(): any;
    currentPiece(): PieceType | undefined;
    do_hold(): boolean;
    getCurrent(): any;
    /**
     * 盤面を文字列で返す（"I..T..." × 22行）
     */
    getGrid(): string;
    getHold(): any;
    getQueue(): any;
    get_cell(x: number, y: number): PieceType | undefined;
    ghost_y_internal(): number;
    grounded(): boolean;
    hard_drop(): void;
    move_h(dx: number): boolean;
    constructor(seed: bigint);
    pause_toggle(): void;
    /**
     * 未読イベントをすべて取り出す（フロント演出用）
     */
    popEvents(): any;
    rotate(dir: number): boolean;
    set_cell(x: number, y: number, v?: PieceType | null): void;
    soft_drop(): boolean;
    startGame(mode: GameMode, seed: bigint): void;
    tick(dt: number): void;
    readonly combo: number;
    readonly curRot: number;
    readonly curX: number;
    readonly curY: number;
    readonly elapsedMs: bigint;
    readonly ghostY: number;
    readonly level: number;
    readonly lines: number;
    readonly score: bigint;
    finished: boolean;
    mode: GameMode;
    state: GameState;
}

export enum GameMode {
    Marathon = 0,
    Sprint = 1,
    Ultra = 2,
}

export enum GameState {
    Title = 0,
    Playing = 1,
    Paused = 2,
    GameOver = 3,
}

export enum PieceType {
    I = 0,
    O = 1,
    T = 2,
    S = 3,
    Z = 4,
    J = 5,
    L = 6,
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_game_free: (a: number, b: number) => void;
    readonly __wbg_get_game_finished: (a: number) => number;
    readonly __wbg_get_game_mode: (a: number) => number;
    readonly __wbg_get_game_state: (a: number) => number;
    readonly __wbg_set_game_finished: (a: number, b: number) => void;
    readonly __wbg_set_game_mode: (a: number, b: number) => void;
    readonly __wbg_set_game_state: (a: number, b: number) => void;
    readonly game_cell_char: (a: number, b: number, c: number) => number;
    readonly game_combo: (a: number) => number;
    readonly game_curRot: (a: number) => number;
    readonly game_curX: (a: number) => number;
    readonly game_curY: (a: number) => number;
    readonly game_cur_type: (a: number) => number;
    readonly game_currentCells: (a: number) => any;
    readonly game_currentPiece: (a: number) => number;
    readonly game_do_hold: (a: number) => number;
    readonly game_elapsedMs: (a: number) => bigint;
    readonly game_getCurrent: (a: number) => any;
    readonly game_getGrid: (a: number) => [number, number];
    readonly game_getHold: (a: number) => any;
    readonly game_getQueue: (a: number) => any;
    readonly game_get_cell: (a: number, b: number, c: number) => number;
    readonly game_ghostY: (a: number) => number;
    readonly game_ghost_y_internal: (a: number) => number;
    readonly game_grounded: (a: number) => number;
    readonly game_hard_drop: (a: number) => void;
    readonly game_level: (a: number) => number;
    readonly game_lines: (a: number) => number;
    readonly game_move_h: (a: number, b: number) => number;
    readonly game_new: (a: bigint) => number;
    readonly game_pause_toggle: (a: number) => void;
    readonly game_popEvents: (a: number) => any;
    readonly game_rotate: (a: number, b: number) => number;
    readonly game_score: (a: number) => bigint;
    readonly game_set_cell: (a: number, b: number, c: number, d: number) => void;
    readonly game_soft_drop: (a: number) => number;
    readonly game_startGame: (a: number, b: number, c: bigint) => void;
    readonly game_tick: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
