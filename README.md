# MicroData

![home_screen](https://github.com/KierPalin/MicroData/blob/main/resources/MicroData_1_5.png?raw=true)

An application for the Microbit V2 + an Arcade shield that makes collecting data from the Microbit's sensors easy and fun. MicroData can be used to enhance scientific experiments inside & outside of the classroom - without the need for an external computer. MicroData allows you to:
* Record data and events into flash storage.
* View real-time graphs of sensor readings.
* Create graphs from recorded data.
* View data & events in a tabular format.
* Use Jacdac sensors for Light, Soil moisture, Distance, Flexibility, Temperature.
* Command other Microbits (including those without Arcade Shields) to log data.
* Collect data from sensors on other Microbits over the radio.

MicroData makes it easy to select and configure sensors. The data collected through it can be used to:
* Teach and better understand Data Science.
* Experiment with Physical Computing.
* Perform Science experiments.
* Explore the diverse features of the BBC Microbit V2.

**You will need an Arcade Shield for the micro:bit V2 to make use of MicroData.**


# Experiments

A walkthrough of some of the experiments you can do with MicroData are available in ![EXPERIMENTS.MD](https://github.com/KierPalin/MicroData/blob/main/EXPERIMENTS.MD).


# Releases

The binary.hex files for the most recent releases of MicroData are available ![here](https://github.com/KierPalin/MicroData/releases).<br>
Both ![microdata-v1.5.1](https://github.com/KierPalin/MicroData/releases/tag/v1.5.1) and ![microdata-no-jacdac-mode-v1.5.0](https://github.com/KierPalin/MicroData/releases/tag/v1.5.0) have the latest features. There are some trade-offs between them though:
* ![microdata-v1.5.1](https://github.com/KierPalin/MicroData/releases/tag/v1.5.1) has support for all sensors. When the Arcade Shield is not connected the microbit defaults to Commander mode (it listens to logging commands over the radio).
* ![microdata-no-jacdac-mode-v1.5.0](https://github.com/KierPalin/MicroData/releases/tag/v1.5.0) does not support the Jacdac. When the Arcade Shield is not connected the microbit defaults to a mode that allows you to log data without an Arcade Shield (or enter Commander mode).<br>

If you want to record data without an Arcade Shield and you do not need Jacdac sensors then use the ![microdata-no-jacdac-mode-v1.5.0](https://github.com/KierPalin/MicroData/releases/tag/v1.5.0) release.

# Building

### Via MakeCode CLI (recommended)

1. Install the [MakeCode CLI](https://microsoft.github.io/pxt-mkc/).
2. Attach a micro:bit to your computer using USB cable.
3. Clone this repo and cd to it
4. invoke `mkc -d`, which will produce the MicroData hex file (in built/mbcodal-binary.hex) and copy it to the micro:bit drive.

#### Via Web App

You need to use https://makecode.microbit.org/beta currently to build MicroData. You can load this repo into MakeCode using the Import button in the home page and selecting "Import URL". Please note that there is currently no simulator support for the arcade shield extension (https://github.com/microsoft/pxt-arcadeshield) that MicroData depends on.

#### Via VS Code MakeCode extension

1.	Clone https://github.com/microsoft/vscode-makecode
2.	cd to vscode-makecode repo directory and checkout branch dev/riknoll/simx
3.	yarn install
4.	code .
5.	F5 to run new instance of VS Code
6.	open folder to the directory of this repo
