'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');

class Kanikeenkortebroekaan extends Homey.App {
	/**
	 * Queries the kanikeenkortebroekaan website if shorts are a good idea today.
	 * @return {Promise} which returns true or false, depending on the result.
	 */
	queryWebsite() {
		return new Promise((resolve, reject) => {
			fetch('http://www.kanikeenkortebroekaan.nl/')
				.then((res) => {
					return res.text();
				})
				.then((text) => {
					resolve(text.match(/class="ja"/));
				})
				.catch((err) => {
					reject(err);
				})
		});
	}

	/**
	 * Updates the screensaver. Queries the website, then changes the color of
	 * the screensaver, depending on the result.
	 */
	updateScreensaver() {
		this.queryWebsite()
			.then((result) => {
				if (result) {
					this.animation.updateFrames(this.yesFrames);
				} else {
					this.animation.updateFrames(this.noFrames);
				}
			})
			.catch((err) => {
				this.animation.updateFrames(this.errorFrames);
			});
	}

	/**
	 * Creates a frame with 24 LEDs of the same color, for an LED ring
	 * animation.
	 * @param  {Object} data The R,G,B object that should be repeated.
	 * @return {Array} The resulting frame.
	 */
	createSolidFrames(data) {
		let frames = [];
		let frame = [];

		for (let i = 0; i < 24; i++) {
			frame.push(data);
		}

		frames.push(frame);

		return frames;
	}

	/**
	 * Initializes the application.
	 */
	onInit() {
		Homey.ManagerSpeechInput.on('speechEval', (speech, callback) => {
			callback(null, true);
		});

		Homey.ManagerSpeechInput.on('speechMatch', (speech, onSpeechEvalData) => {
			this.queryWebsite()
				.then((result) => {
					if (result) {
						speech.say(Homey.__('result.yes'));
					} else {
						speech.say(Homey.__('result.no'));
					}
				})
				.catch((err) => {
					speech.say(Homey.__('result.error'));
				});
		});

		this.interval = null;

		this.yesFrames = this.createSolidFrames({
			r: 0,
			g: 255,
			b: 0
		});

		this.noFrames = this.createSolidFrames({
			r: 255,
			g: 0,
			b: 0
		});

		this.errorFrames = this.createSolidFrames({
			r: 255,
			g: 255,
			b: 0
		});

		this.animation = new Homey.LedringAnimation({
			options: {
				fps: 1,
				tfps: 60,
				rpm: 0
			},
			frames: this.errorFrames,
			priority: 'INFORMATIVE',
			duration: 3000
		});

		this.animation
			.on('start', () => {
				this.interval = setInterval(() => {
					this.updateScreensaver();
				}, 1000 * 1800);

				this.updateScreensaver();
			})
			.on('stop', () => {
				clearInterval(this.interval);
			})
			.register()
				.then(() => {
					return this.animation.registerScreensaver('kanikeenkortebroekaan');
				})
				.catch((err) => {
					this.log(err);
				});
	}
}

module.exports = Kanikeenkortebroekaan;
