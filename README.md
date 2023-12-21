Input field for Phaser 3 using BitmapText.

[Demo](https://bagyoni.github.io/phaser3-pixelinput/example/example.html)

Has:
- typing
- left-right navigation
- text selection
- copy-paste
- undo-redo

Doesn't have:
- multiline support
- mouse interaction
- dynamic size
- pasting text from OS clipboard

Usage:

In the game config, put
```
plugins: {
  global: [PixelInputPlugin.DEFAULT_CFG]
}
```

Then use it like this:
```
const config = {
  x: 25,
  y: 50,
  font: "atari-classic",
  font_size: 8,
  width: 250,
  height: 12
};
let input = this.add.pixelInput(config);
input.text = "Hello world!";
```
