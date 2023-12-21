const path = require("path");

module.exports = {
	entry: "./js/pixelinput.js",
	mode: "production",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "pixelinput.min.js",
		library: "PixelInputPlugin",
		libraryTarget: "umd"
	},
	externals: {
		phaser: {
			root: "Phaser",
			umd: "phaser",
			commonjs2: "phaser",
			commonjs: "phaser",
			amd: "phaser"
		}
	}
};
