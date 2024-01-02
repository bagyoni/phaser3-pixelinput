const Phaser = require("phaser");

const border = 1;
const padding = 2;
const clipboard_key = "pixelinput.clipboard";

const default_config = {
	x: 0,
	y: 0,
	width: 100,
	height: 10,
	font: "please specify a font",
	font_size: 16,
	border_color: 0x000000,
	bg_color: 0xffffff,
	text_color: 0x000000,
	selection_color: 0x888888,
	selected_text_color: 0xffffff,
	allowed_characters: Phaser.GameObjects.RetroFont.TEXT_SET1,
	character_limit: 256,
	history_limit: 256
};

class PixelInput extends Phaser.GameObjects.Container {
	constructor(scene, config) {
		super(scene, config.x, config.y);
		this._config = config = Object.assign({}, default_config, config);
		this._allowed_characters = [...config.allowed_characters];
		this._width = config.width;
		this._height = config.height;
		this._history = [];
		this._history_index = -1;
		this._inner_mask = this._createMask();
		this._box = this._createBox();
		this._cursor = this._createCursor();
		this._bmtext = this._createText();
		this._fixLineHeight();
		this._selection_pos = 0; // where the cursor was when we started selecting
		this._cursor_pos = 0;
		this._cursor_height = this._line_height;
		this._refresh();
		scene.input.keyboard.on("keydown", this._onKeyDown, this);
	}

	get text() {
		return this._bmtext.text;
	}

	set text(value) {
		// not a user edit, so not saving to history
		this._insertText(value, 0, Infinity, false);
		this._refresh();
	}

	get selectionStart() {
		return Math.min(this._selection_pos, this._cursor_pos);
	}

	get selectionEnd() {
		return Math.max(this._selection_pos, this._cursor_pos);
	}

	get clipboard() {
		// not all browsers support reading the OS's clipboard, so we use local storage instead
		return localStorage.getItem(clipboard_key);
	}

	set clipboard(value) {
		if (value.length > 0) {
			localStorage.setItem(clipboard_key, value);
			// OTOH, every browser supports writing it, so let's use that at least
			navigator.clipboard.writeText(value);
		}
	}

	clearHistory() {
		this._history = [];
		this._history_index = -1;
	}

	destroy(fromScene) {
		this.scene.input.keyboard.off("keydown", this._onKeyDown, this);
		super.destroy(fromScene);
		this._inner_mask.bitmapMask.destroy(fromScene);
		this._inner_mask.destroy(fromScene);
	}

	_fixLineHeight() {
		// makes sure the y offset of a glyph is always a whole number
		let font = this._bmtext.fontData;
		let scale = this._bmtext.fontSize / font.size;
		let bad_line_height = font.lineHeight * scale;
		let good_line_height = Math.ceil(bad_line_height);
		this._bmtext.setLineSpacing((good_line_height - bad_line_height) / scale);
		this._line_height = good_line_height;
	}

	_createBox() {
		let box = this.scene.add
			.graphics({ x: 0, y: 0 })
			.fillStyle(this._config.border_color)
			.fillRect(0, 0, this._width, this._height)
			.fillStyle(this._config.bg_color)
			.fillRect(border, border, this._width - border * 2, this._height - border * 2)
			.setScrollFactor(0);
		this.add(box);
		return box;
	}

	_createCursor() {
		let cursor = this.scene.add
			.graphics({ x: 0, y: 0 })
			.setScrollFactor(0);
		this.add(cursor);
		cursor.setMask(this._inner_mask);
		return cursor;
	}

	_createText() {
		let text = this.scene.add
			.bitmapText(padding, padding, this._config.font, "", this._config.font_size)
			.setScrollFactor(0);
		this.add(text);
		text.tintFill = this._config.text_color;
		text.setMask(this._inner_mask);
		return text;
	}

	_createMask() {
		let mask_box = this.scene.add
			.graphics({ x: this.x + padding, y: this.y + padding })
			.fillStyle(0x000000)
			.fillRect(0, 0, this._width - padding * 2, this._height)
			.setScrollFactor(0);
		mask_box.visible = false;
		return this.scene.add.bitmapMask(mask_box);
	}

	_updateHistory() {
		this._history.splice(this._history_index + 1);
		this._history.push(this._bmtext.text);
		if (this._history.length > this._config.history_limit) {
			this._history.splice(0, this._history.length - this._config.history_limit);
		}
		this._history_index = this._history.length - 1;
	}

	_undo() {
		this._history_index = Math.max(-1, this._history_index - 1);
		let text = this._history_index > -1 ? this._history[this._history_index] : "";
		this._insertText(text, 0, Infinity, false);
	}

	_redo() {
		this._history_index = Math.min(this._history.length - 1, this._history_index + 1);
		this._insertText(this._history[this._history_index], 0, Infinity, false);
	}

	_onKeyDown(event) {
		if (!this.visible) {
			return;
		}
		this._handleKeystrokes(event) || this._handleKeys(event);
		this._refresh();
	}

	_handleKeystrokes(event) {
		if (!event.ctrlKey) {
			return false;
		}
		let selection = this._bmtext.text.slice(this.selectionStart, this.selectionEnd);
		switch (event.keyCode) {
			case Phaser.Input.Keyboard.KeyCodes.A:
				this._cursor_pos = this._bmtext.text.length;
				this._selection_pos = 0;
				break;
			case Phaser.Input.Keyboard.KeyCodes.C:
				this.clipboard = selection;
				break;
			case Phaser.Input.Keyboard.KeyCodes.V:
				this._insertText(this.clipboard, this.selectionStart, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.X:
				this.clipboard = selection;
				this._insertText("", this.selectionStart, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.Y:
				this._redo();
				break;
			case Phaser.Input.Keyboard.KeyCodes.Z:
				this._undo();
				break;
		}
		return true;
	}

	_handleKeys(event) {
		switch (event.keyCode) {
			case Phaser.Input.Keyboard.KeyCodes.BACKSPACE:
				let start = this.selectionStart;
				if (start === this.selectionEnd) {
					start--;
				}
				start = Math.max(0, start);
				this._insertText("", start, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.ENTER:
				this._insertText("\n", this.selectionStart, this.selectionEnd);
				break;
			case Phaser.Input.Keyboard.KeyCodes.LEFT:
				this._cursor_pos = Math.max(0, this._cursor_pos - 1);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.RIGHT:
				this._cursor_pos = Math.min(this._bmtext.text.length, this._cursor_pos + 1);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.UP:
				this._seekLine(false);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.DOWN:
				this._seekLine(true);
				this._selection_pos = event.shiftKey ? this._selection_pos : this._cursor_pos;
				break;
			case Phaser.Input.Keyboard.KeyCodes.TAB:
				this._insertText("  ", this.selectionStart, this.selectionEnd);
				break;
			default:
				if (event.key.length !== 1) {
					break;
				}
				this._insertText(event.key, this.selectionStart, this.selectionEnd);
				break;
		}
	}

	_seekLine(next_line) {
		if (!this._allowed_characters.includes("\n")) {
			return;
		}
		let last_eol_index = this.text.substring(0, this._cursor_pos).lastIndexOf("\n");
		let cursor_column = this._cursor_pos - last_eol_index;
		let sought_eol_index;
		if (next_line) {
			sought_eol_index = this.text.indexOf("\n", this._cursor_pos);
			sought_eol_index = sought_eol_index < 0 ? this.text.length : sought_eol_index;
		} else {
			sought_eol_index = this.text.substring(0, last_eol_index).lastIndexOf("\n");
		}
		let next_eol_index = this.text.indexOf("\n", sought_eol_index + 1);
		next_eol_index = next_eol_index < 0 ? this.text.length : next_eol_index;
		this._cursor_pos = Math.min(next_eol_index, sought_eol_index + cursor_column);
	}

	_refresh() {
		let characters = this._bmtext.getTextBounds().characters;
		this._updateTextPosition(characters);
		this._updateSelection(characters);
	}

	_insertText(text, start, end, update_history = true) {
		text = this._sanitizeText(text);
		start = Math.max(0, start);
		let full_text = this._bmtext.text.slice(0, start) + text + this._bmtext.text.slice(end);
		if (full_text.length > this._config.character_limit) {
			return;
		}
		this._bmtext.text = full_text;
		this._cursor_pos = start + text.length;
		this._selection_pos = this._cursor_pos;
		if (update_history) {
			this._updateHistory();
		}
	}

	_sanitizeText(text) {
		return [...text].filter(char => this._allowed_characters.includes(char)).join("");
	}

	_updateTextPosition(characters) {
		let cursor_x = this._getCursorCoordinates(characters, this._cursor_pos).x;
		let left_offset = Math.max(0, padding - cursor_x);
		let right_offset = Math.max(0, cursor_x - (this._width - padding - 1));
		this._bmtext.x += left_offset - right_offset;
		let cursor_y = this._getCursorCoordinates(characters, this._cursor_pos).y;
		let cursor_bottom = cursor_y + this._cursor_height;
		let top_offset = Math.max(0, padding - cursor_y);
		let bottom_offset = Math.max(0, cursor_bottom - (this._height - padding));
		this._bmtext.y += top_offset - bottom_offset;
	}

	_updateSelection(characters) {
		this._drawMultilineSelection(characters, this.selectionStart, this.selectionEnd);
		this._updateSelectionTint(characters);
	}

	_drawSingleLineSelection(characters, start, end) {
		let start_coords = this._getCursorCoordinates(characters, start);
		let start_x = start_coords.x;
		let start_y = start_coords.y;
		let end_x = this._getCursorCoordinates(characters, end).x;
		this._cursor
			.fillStyle(this._config.selection_color)
			.fillRect(start_x, start_y, Math.max(1, end_x - start_x + 1), this._cursor_height);
	}

	_drawMultilineSelection(characters, start, end) {
		this._cursor.clear();
		for (let i = start; i < end; i++) {
			if (this.text[i] === "\n") {
				this._drawSingleLineSelection(characters, start, i);
				start = i + 1;
			}
		}
		this._drawSingleLineSelection(characters, start, end);
	}

	_updateSelectionTint(characters) {
		if (characters.length === 0) {
			return;
		}
		let chr_start = this._getCharacterAtIndex(characters, this.selectionStart);
		let chr_end = this._getCharacterAtIndex(characters, this.selectionEnd);
		let start = chr_start.i + (chr_start.idx < this.selectionStart ? 1 : 0);
		let end = chr_end.i + (chr_end.idx < this.selectionEnd ? 1 : 0);
		this._bmtext
			.setCharacterTint(0, -1, true, this._config.text_color)
			.setCharacterTint(start, end - start, true, this._config.selected_text_color);
	}

	_getCursorCoordinates(characters, char_index) {
		if (characters.length === 0) {
			return { x: padding, y: padding };
		}
		let character = this._getCharacterAtIndex(characters, char_index);
		let x = character.idx === char_index ? character.x : character.r + 1;
		return { x: x + this._bmtext.x - 1, y: character.t + this._bmtext.y };
	}

	_getCharacterAtIndex(characters, char_index) {
		let rightmost = characters
			.filter(c => c.idx <= char_index)
			.reduce((rightmost, c) => (rightmost.idx < c.idx ? c : rightmost), characters[0]);
		if (this.text[char_index - 1] === "\n" || char_index === 0) {
			let lines = this.text.slice(0, char_index).split("\n").length - 1;
			return {
				i: rightmost.i,
				idx: rightmost.idx,
				x: padding - 1,
				r: padding - 2,
				t: lines * this._line_height
			};
		}
		return rightmost;
	}
}

module.exports = class PixelInputPlugin extends Phaser.Plugins.BasePlugin {
	constructor(pluginManager) {
		super(pluginManager);
	}

	static get DEFAULT_CFG() {
		return {
			key: "PixelInput",
			plugin: PixelInputPlugin,
			start: true
		};
	}

	init() {
		this.pluginManager.registerGameObject("pixelInput", this._addPixelInput);
	}

	_addPixelInput(config) {
		let input = new PixelInput(this.scene, config);
		this.displayList.add(input);
		return input;
	}
};
