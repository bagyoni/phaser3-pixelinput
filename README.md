Input field for Phaser 3 using BitmapText.

[Demo](https://bagyoni.github.io/phaser3-pixelinput/example/example.html)

Has:
- typing
- multiline support
- navigation with arrow keys
- text overflow handling (horizontal and vertical)
- text selection
- copy-paste
- undo-redo

Doesn't have:
- mouse interaction
- resizing
- pasting text from OS clipboard

Usage:

In the game config, put
```js
plugins: {
  global: [PixelInputPlugin.DEFAULT_CFG]
}
```

Then use it like this:
```js
let input_config = {
  x: 25,
  y: 50,
  font: "atari-classic",
  font_size: 8,
  width: 250,
  height: 12,
  allowed_characters: Phaser.GameObjects.RetroFont.TEXT_SET1
};
let input = this.add.pixelInput(input_config);
input.text = "Hello world!";
```

For a multiline input field, include `"\n"` in `allowed_characters`.
