namespace microdata {
    import Screen = user_interface_base.Screen
    import CursorScene = user_interface_base.CursorScene
    import CursorSceneEnum = user_interface_base.CursorSceneEnum
    import Button = user_interface_base.Button
    import ButtonStyles = user_interface_base.ButtonStyles
    import AppInterface = user_interface_base.AppInterface
    import font = user_interface_base.font

    /**
     * Is this Microbit sending commands to others or is it being instructed by a Commander? 
     */
    export const enum RADIO_LOGGING_MODE {
        /**
         * Status when just starting prior to .initialiseCommunication() invocation.
         */
        UNCONFIGURED,
        /**
         * Must have an Arcade Shield connected and be first uBit.
         * Only 1 commander at a time.
         * User can command other uBit's to log data according to some config.
         */
        COMMANDER,
        /**
         * Default state if no Arcade Shield is connected.
         * Takes radio requests from the commander.
         */
        TARGET
    }

    /**
     * The types of requests that a uBit will send over radio.
     * See NETWORK_COMMAND_STRING for the string that is sent tot convey each Enum.
     */
    export const enum NETWORK_COMMAND {
        JOIN_REQUEST,
        START_LOGGING,
        BECOME_TARGET,
        GET_ID,
        DATA_STREAM,
        DATA_STREAM_FINISH
    }

    /**
     * The exact string send over radio to convey a NETWORK_COMMAND
     */
    export const NETWORK_COMMAND_STRING = [
        "J", // "JOIN_REQUEST",
        "S", // "START_LOGGING",
        "T", // "BECOME_TARGET",
        "G", // "GET_ID",
        "D", // "DATA_STREAM",
        "F"  // "DATA_STREAM_FINISH"
    ]

    //** See .initialiseCommunication() */
    const RADIO_GROUP: number = 1;
    //** See .initialiseCommunication() */
    const TRANSMIT_POWER: number = 5;
    //** See .initialiseCommunication() */
    const FREQUENCY_BAND: number = 0;

    /**
     * Each message (see NETWORK_COMMAND and NETWORK_COMMAND_STRING) has these components.
     */
    const enum MESSAGE_COMPONENT {
        NETWORK_COMMAND,
        /** A CSV stream of data. */
        DATA_START
    }

    /** How long to wait between messages before timeout. */
    const MESSAGE_LATENCY_MS: number = 100;

    /** Default ID that all Microbits start with, 
     *  If a Microbit becomes a Commander it will give itself the ID 0. 
     *  If the Microbit finds an existing Commander it will be told to become a Target, and be given an ID
     */
    const UNINITIALISED_MICROBIT_ID: number = -1

    /**
     * An object that implements this interface is passed to the SensorScheduler so that it when a log is made,
     * The target can send a copy of that log message back to the Commander over radio.
     * Additionally, the DistributedLoggingScreen implements this interface so that the screen can update only when needed.
     */
    export interface ITargetDataLoggedCallback {
        callback(rowTheTargetLogged: string): void;
    }


    /**
     * This protocol is used by both the DistributedLoggingScreen AND by Microbits that do not have an Arcade Shield (see app.ts) 
     * to manage how Microbits communicate
     * There can only be 1 Commander - which must have an Arcade Shield, this Commander has options to control the Targets.
     * Targets are Microbits that may (or may not) have an Arcade Shield connected to them. They have a unique ID and they passively respond to the Commanders requests
     * 
     * The user can select and configure sensors then tell Targets to log them, and optionally send that data back to the Commander.
     * The Commander can get a list of the IDs of connected Targets and see the data from sensors being streamed back.
     */
    export class DistributedLoggingProtocol implements ITargetDataLoggedCallback {
        //------------------------------------------------------
        // Variables used by both the Commander and the Targets:
        //------------------------------------------------------

        public id: number;

        /** Target (many) or Commander (only can be 1)? This is set inside .initialiseCommunication() and does not change thereon. */
        public radioMode: RADIO_LOGGING_MODE;

        /** A Microbit that does not have an Arcade Shield connected cannot become a Commander, and needs to display its logging information differently. */
        private arcadeShieldIsConnected: boolean;

        /** The Target tells the Commander when it has finished. SensorScheduler.start() modifies this static*/
        public static finishedLogging: boolean = false;

        //-----------------------------------
        // NETWORK_COMMAND MESSSAGE HANDLING:
        //-----------------------------------

        /** There is a limit on the length of radio messages, so longer messages - such as those required for:
         *      sending logs between the Target and the Commander
         *      sending the list of sensors and their configuration information from the Commander to the Target
         *  need to be split up into multiple messages.
         * 
         * This variable is sent to and set from the content in a message starting with NETWORK_COMMAND.START_LOGGING
         * Set alongside numberOfMessagesReceived
         */
        private numberOfMessagesExpected: number;

        /**
         * This variable is sent to and set from the content in a message starting with NETWORK_COMMAND.START_LOGGING
         * Set alongside numberOfMessagesExpected
         */
        private numberOfMessagesReceived: number;

        /** The Target needs to build a list of sensors from sensor names, configure them according to the Commander's specification, then pass that to the recorder */
        private sensors: Sensor[]

        //--------------------------
        // Commander only Variables:
        //--------------------------

        private static nextMicrobitIDToIssue: number;
        public numberOfTargetsConnected: number;
        private callbackObj: ITargetDataLoggedCallback;

        /** Should the target send each row of data it logs back to the Commander? See DistributedLoggingProtocol.log() */
        private streamDataBack: boolean;

        /** */
        private targetIDs: number[]

        constructor(app: AppInterface, arcadeShieldIsConnected: boolean, callbackObj?: ITargetDataLoggedCallback) {
            control.singleSimulator()

            //-----------------------------------------------------------------------
            // Unbind A & B: Since we may've come from headless mode which uses them.
            //-----------------------------------------------------------------------

            input.onButtonPressed(1, () => { });
            input.onButtonPressed(2, () => { });

            //------------------------------------------------------
            // Variables used by both the Commander and the Targets:
            //------------------------------------------------------

            this.id = UNINITIALISED_MICROBIT_ID;
            this.radioMode = RADIO_LOGGING_MODE.UNCONFIGURED;
            this.arcadeShieldIsConnected = arcadeShieldIsConnected;

            //-----------------------------------
            // NETWORK_COMMAND MESSSAGE HANDLING:
            //-----------------------------------

            this.numberOfMessagesExpected = 0;
            this.numberOfMessagesReceived = 0;

            this.sensors = []

            //--------------------------
            // Commander only Variables:
            //--------------------------

            DistributedLoggingProtocol.nextMicrobitIDToIssue = 0;
            this.numberOfTargetsConnected = 0;
            this.callbackObj = callbackObj;
            this.streamDataBack = false
            this.targetIDs = []

            // Default Microbit display when unconnected (not a target):
            if (!arcadeShieldIsConnected) {
                basic.showLeds(`
                    . . . . .
                    . . . . .
                    . . . . .
                    . . . . .
                    . # # # .
                `)
            }
            this.initialiseCommunication()
        }

        callback(newRowAsCSV: string): void {
            if (DistributedLoggingProtocol.finishedLogging)
                this.sendMessage(this.createMessage(NETWORK_COMMAND.DATA_STREAM_FINISH))
            else
                this.sendMessage(NETWORK_COMMAND_STRING[NETWORK_COMMAND.DATA_STREAM] + "," + this.id + "," + newRowAsCSV)
        }

        //---------------------------------------------
        // Message Creation and Transmission Utilities:
        //---------------------------------------------

        /**
         * Standardised Message used to communicate with the other Microbits.
         * @param cmdEnum NETWORK_COMMAND that will become a NETWORK_COMMAND_STRING in the message
         * @param data Optional list of data.
         * @returns A formatted string that will be sent over radio via DistributedLogging.sendMessage()
         */
        private createMessage(cmdEnum: NETWORK_COMMAND, data?: string[]): string {
            let message: string = NETWORK_COMMAND_STRING[cmdEnum] + ((data != null) ? "," : "")
            if (data != null)
                for (let i = 0; i < data.length; i++) {
                    message += data[i] + ((i + 1 != data.length) ? "," : "")
                }
            return message
        }

        private sendMessage(message: string): void { radio.sendString(message) }


        private initialiseCommunication() {
            radio.setGroup(RADIO_GROUP)
            radio.setTransmitPower(TRANSMIT_POWER)
            radio.setFrequencyBand(FREQUENCY_BAND)

            // A Microbit without an Arcade Shield cannot become a Commander; so force this Microbit to become a Target:
            if (!this.arcadeShieldIsConnected) {
                this.becomeTarget()

                while (this.id == UNINITIALISED_MICROBIT_ID) {
                    this.sendMessage(this.createMessage(NETWORK_COMMAND.JOIN_REQUEST))
                    basic.pause(MESSAGE_LATENCY_MS)
                }
            }
            else {
                let responseReceived = false

                // Listen from a response from a Commander:
                radio.onReceivedString(function(receivedString) {
                    const message = receivedString.split(",")

                    // Command to become a target has been received:
                    if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.BECOME_TARGET]) {
                        responseReceived = true
                        this.id = message[MESSAGE_COMPONENT.DATA_START]
                    }
                })

                // The join request message, will be sent out and waited on 5 times:
                const message: string = this.createMessage(NETWORK_COMMAND.JOIN_REQUEST)

                // Timeout:
                for (let _ = 0; _ < 3; _++) {
                    // Account for onReceivedString processing:
                    this.sendMessage(message)
                    basic.pause(MESSAGE_LATENCY_MS)

                    // Means a Commander has replied:
                    if (responseReceived)
                        break
                    basic.pause(MESSAGE_LATENCY_MS)
                }

                // ---------------------------------
                // Become the Commander or a Target:
                // ---------------------------------

                if (responseReceived)
                    this.becomeTarget()
                else
                    this.becomeCommander()
            }
        }


        //------------------------
        // Target-only Methods:
        //------------------------

        private addSensor(sensor: Sensor) {
            this.sensors.push(sensor);
        }


        private becomeTarget() {
            /**
             * Internal function responsible for choosing the correct response to the incoming message.
             * Default state of radio.onReceivedString()
             * Message with 'NETWORK_COMMAND.START_LOGGING' -> 'radio.onReceivedString(getSensorConfigData)'
             * @param receivedString The first message in a command; SENDER_ID + NETWORK_COMMAND + ?ADDITIONAL_INFO (number of future messages for START_LOGGING as an example)
             */
            radio.onReceivedString(function(receivedString: string): void {
                const message = receivedString.split(",")

                if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.START_LOGGING]) {
                    this.numberOfMessagesExpected = message[MESSAGE_COMPONENT.DATA_START]
                    this.streamDataBack = message[MESSAGE_COMPONENT.DATA_START + 1] == "1"
                    this.numberOfMessagesReceived = 0
                    this.sensors = []

                    if (this.id == UNINITIALISED_MICROBIT_ID)
                        this.sendMessage(this.createMessage(NETWORK_COMMAND.JOIN_REQUEST))
                }


                /**
                 * COMMANDER GIVES THIS TARGET A NEW ID
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.BECOME_TARGET] && this.id == UNINITIALISED_MICROBIT_ID) {
                    this.id = message[MESSAGE_COMPONENT.DATA_START]
                }

                /**
                 * COMMANDER REQUESTS ID
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.GET_ID]) {
                    basic.pause(50 * this.id) // The Commander's request is broadcast, we don't want all the Targets to transmit at the same time, so wait a bit.
                    this.sendMessage(this.createMessage(NETWORK_COMMAND.GET_ID, [this.id]))
                }


                /**
                 * COMMANDER SENDS DATA_STREAM
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.DATA_STREAM]) {
                    if (this.numberOfMessagesReceived < this.numberOfMessagesExpected) {
                        this.numberOfMessagesReceived += 1

                        const dataStream = message.slice(MESSAGE_COMPONENT.DATA_START)
                        const sensorName = dataStream[0]

                        let sensor = Sensor.getFromName(sensorName)

                        const configType = dataStream[1]
                        if (configType == "P") {
                            const measurements: number = +dataStream[2]
                            const period: number = +dataStream[3]
                            sensor.setConfig({ measurements, period })
                        }

                        else if (configType == "E") {
                            const measurements: number = +dataStream[2]
                            const inequality: string = dataStream[3]
                            const comparator: number = +dataStream[4]
                            sensor.setConfig({ measurements, period: SENSOR_EVENT_POLLING_PERIOD_MS, inequality, comparator })
                        }

                        this.addSensor(sensor)

                        // Reset state after all messages for this request are handled:
                        if (this.numberOfMessagesReceived >= this.numberOfMessagesExpected) {
                            this.numberOfMessagesReceived = 0
                            this.numberOfMessagesExpected = 0

                            if (this.arcadeShieldIsConnected) {
                                this.app.popScene()
                                this.app.pushScene(new DataRecorder(this.app, this.sensors))
                            }
                            else {
                                const scheduler = new SensorScheduler(this.sensors, true)
                                scheduler.start((this.streamDataBack) ? this : null)
                            }
                        }
                    }
                }
            }) // end of radio.onReceivedString

            this.radioMode = RADIO_LOGGING_MODE.TARGET

            // Indicate the uBit is now a Target:
            if (!this.arcadeShieldIsConnected) {
                basic.showLeds(`
                    . # . # .
                    . # . # .
                    . . . . .
                    # . . . #
                    . # # # .
                `)
            }
        }

        //------------------------
        // Commander-only Methods:
        //------------------------

        protected addTargetID(id: number) {
            this.targetIDs.push(id)
            this.targetIDs = this.targetIDs.sort();
        }
        protected isDuplicateTarget(id: number) { return this.targetIDs.filter((value) => value == id).length }


        private becomeCommander() {
            this.radioMode = RADIO_LOGGING_MODE.COMMANDER
            this.id = 0
            DistributedLoggingProtocol.nextMicrobitIDToIssue = 1
            this.numberOfTargetsConnected = 0

            radio.onReceivedString(function commanderControlFlowFn(receivedString: string): void {
                const message = receivedString.split(",")

                /**
                 * INCOMING JOIN REQUEST
                 */
                if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.JOIN_REQUEST]) {
                    const becomeTargetMessage = this.createMessage(NETWORK_COMMAND.BECOME_TARGET, [DistributedLoggingProtocol.nextMicrobitIDToIssue])
                    this.sendMessage(becomeTargetMessage)

                    DistributedLoggingProtocol.nextMicrobitIDToIssue += 1
                    this.numberOfTargetsConnected += 1
                }

                /**
                 * INCOMING GET ID RESPONSE
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.GET_ID]) {
                    const targetID = message[MESSAGE_COMPONENT.DATA_START];
                    if (this.isDuplicateTarget(targetID))
                        return
                    this.addTargetID(targetID)
                }

                /**
                 * INCOMING FINISHED RESPONSE
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.DATA_STREAM_FINISH]) {
                    DistributedLoggingScreen.streamingDone = true
                }

                /**
                 * INCOMING DATA STREAM
                 */
                else if (message[MESSAGE_COMPONENT.NETWORK_COMMAND] == NETWORK_COMMAND_STRING[NETWORK_COMMAND.DATA_STREAM]) {
                    DistributedLoggingScreen.streamingDone = false;
                    DistributedLoggingScreen.showTabularData = true;
                    TabularDataViewer.updateDataRowsOnNextFrame = true;

                    const cols = message.slice(MESSAGE_COMPONENT.DATA_START);

                    datalogger.log(
                        datalogger.createCV("Microbit", cols[0]),
                        datalogger.createCV("Sensor", Sensor.getFromName(cols[1]).getName()),
                        datalogger.createCV("Time (ms)", cols[2]),
                        datalogger.createCV("Reading", cols[3]),
                        datalogger.createCV("Event", cols[4])
                    );
                }
            })
        }

        //--------------------------------------------------------------------------------
        // Methods invoked on the Commander Screen that tell command the Target Microbits:
        //--------------------------------------------------------------------------------

        /**
         * DistributedLoggingScreen invokes this.
         * Converts a list of sensors and recordingconfigs into a series of messages.
         *      These messages are then transmitted to each Target microbit - which rebuilds a list of sensors and configures them according to that config
         * Optional flag to tell these Targets Microbits to send a copy of each log back to this Commander. The Commander will then also log that data.
         * @param sensors unconfigured sensors selected by the user.
         * @param configs 1 config per sensor, selected by the user.
         * @param streamItBack Should the targets send a copy of each log it makes back to the Commander? 
         */
        public commanderRequestLog(sensors: Sensor[], configs: RecordingConfig[], streamItBack: boolean) {
            DistributedLoggingScreen.streamingDone = false
            const numberOfSensors = sensors.length

            // Let each Target know that there are going to be numberOfSensors messages after this one.
            let messages: string[] = [
                this.createMessage(NETWORK_COMMAND.START_LOGGING, ["" + numberOfSensors, ((streamItBack) ? "1" : "0")]) // START_LOGGING + number of messages + should the data be streamed back?
            ]

            // These NETWORK_COMMAND.DATA_STREAM messages will be handled with aide from the information in the above messages
            for (let i = 0; i < numberOfSensors; i++) {
                messages.push(this.createMessage(NETWORK_COMMAND.DATA_STREAM, [sensors[i].getName(), serializeRecordingConfig(configs[i])]))
            }

            for (let i = 0; i < messages.length; i++) {
                this.sendMessage(messages[i])
                basic.pause(MESSAGE_LATENCY_MS)
            }
        }

        /**
         * Invoked by the targetMicrobitsBtn in DistributedLoggingScreen.
         * Mutates the DistributedLoggingScreen.streamingDone flag to let the screen know when it has received all of the Target IDs.
         * 
         * Inside of DistributedLoggingScreen there is a fiber that polls this when DistributedLoggingScreen is in the UI_STATE.SHOWING_CONNECTED_MICROBITS state
         *      This allows for the screen to update the list of connected Microbits in realtime - so that the user can see when Microbits join & leave instantly.
         * 
         * see .targetIDCache in DistributedLoggingScreen
         * @returns a list of these ids
         */
        public commanderRequestTargetIDs(): number[] {
            DistributedLoggingScreen.streamingDone = false;
            const currentTargetIDs = this.targetIDs;
            for (let i = 0; i < 5; i++) {
                this.targetIDs = [];
                this.sendMessage(this.createMessage(NETWORK_COMMAND.GET_ID));
                basic.pause(200) // Wait for the messages to come in

                if (this.targetIDs.length >= currentTargetIDs.length) {
                    break;
                }
            }

            DistributedLoggingScreen.streamingDone = true;
            return this.targetIDs;
        }
    }

    /**
     * Local enum used in .draw() to control what information should be shown
     */
    const enum UI_STATE {
        SHOWING_OPTIONS,
        SHOWING_CONNECTED_MICROBITS
    }

    /**
     * Responsible for handling the Distributed Communication and Command of multiple Microbits.
     * One Microbit is a Commander, that can manage and send instructions over radio to other Microbits (Targets).
     * The Commander MUST have an Arcade Shield, but it can manage Target Microbits regardless of whether or not they have an Arcade Shield.
     * 
     * The Commander and the Targets both have a GUI for management/information. Information for a Target without an Arcade Shield is displayed in on the 5x5 LED matrix.
     */
    export class DistributedLoggingScreen extends CursorScene implements ITargetDataLoggedCallback {
        private uiState: UI_STATE
        private distributedLogger: DistributedLoggingProtocol;


        /** The user needs to set the sensors and config before sending the request to other Microbits to start logging htose sensors.
         *  In order to do this the Scene needs to change to the SensorSelection and then the recordingConfigSelection.
         *  At the end of the recordingConfigSelection the scene will change back to this DistributedLoggingScreen
         *  This variable is set before swapping to that SensorSelection scene - so that the users initial choice (of streaming the data back or not) is preserved.
         */
        public static showTabularData: boolean = false
        public static streamingDone: boolean = true
        private static streamDataBack: boolean = true

        private static setupDone: boolean = false;

        private targetIDCache: number[]

        constructor(app: AppInterface, sensors?: Sensor[], configs?: RecordingConfig[]) {
            super(app)

            // This DistributedLoggingScreen can take a while to start on account of the DistributedLoggingProtocol.
            // Because of this it is important to unbind the buttons so that they cannot be invoked during setup.
            control.onEvent(ControllerButtonEvent.Pressed, controller.up.id, () => { });
            control.onEvent(ControllerButtonEvent.Pressed, controller.down.id, () => { });
            control.onEvent(ControllerButtonEvent.Pressed, controller.left.id, () => { });
            control.onEvent(ControllerButtonEvent.Pressed, controller.right.id, () => { });
            control.onEvent(ControllerButtonEvent.Pressed, controller.A.id, () => { });
            control.onEvent(ControllerButtonEvent.Pressed, controller.B.id, () => { });

            this.uiState = UI_STATE.SHOWING_OPTIONS
            this.distributedLogger = new DistributedLoggingProtocol(app, true, this)

            this.targetIDCache = []

            DistributedLoggingScreen.showTabularData = datalogger.getNumberOfRows() > 1

            if (sensors != null && configs != null) {
                this.distributedLogger.commanderRequestLog(sensors, configs, DistributedLoggingScreen.streamDataBack)

                if (DistributedLoggingScreen.showTabularData) {
                    this.app.popScene()
                    this.app.pushScene(new TabularDataViewer(this.app, function() { this.app.popScene(); this.app.pushScene(new DistributedLoggingScreen(this.app)) }))
                }
            }

            DistributedLoggingScreen.setupDone = true;
        }

        callback(msg: string) {
            DistributedLoggingScreen.streamingDone = true
        }

        /* override */ startup() {
            super.startup()

            control.onEvent(
                ControllerButtonEvent.Pressed,
                controller.B.id,
                () => {
                    if (DistributedLoggingScreen.setupDone) {
                        if (this.uiState != UI_STATE.SHOWING_OPTIONS) {
                            this.uiState = UI_STATE.SHOWING_OPTIONS
                            this.cursor.visible = true
                        }
                        else if (DistributedLoggingScreen.streamingDone) {
                            this.app.popScene()
                            this.app.pushScene(new Home(this.app));
                        }
                    }
                }
            )

            this.cursor.visible = true
            if (this.uiState != UI_STATE.SHOWING_OPTIONS)
                this.cursor.visible = false

            const y = Screen.HEIGHT * 0.234 // y = 30 on an Arcade Shield of height 128 pixels

            this.navigator.setBtns([[
                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "largeSettingsGear",
                    ariaId: "See connected Microbits",
                    x: -60,
                    y,
                    onClick: () => {
                        if (DistributedLoggingScreen.streamingDone) {
                            this.uiState = UI_STATE.SHOWING_CONNECTED_MICROBITS
                            this.cursor.visible = false
                            this.targetIDCache = []

                            // Start timeout:
                            // Continually request the target ids; so that new incoming targets appear on the list as it is displayed, and outgoing targets leave it, in real-time:
                            control.inBackground(() => {
                                while (this.uiState == UI_STATE.SHOWING_CONNECTED_MICROBITS) {
                                    this.targetIDCache = this.distributedLogger.commanderRequestTargetIDs()
                                    basic.pause(MESSAGE_LATENCY_MS * 2)
                                }
                            })
                        }
                    },
                }),

                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "radio_set_group",
                    ariaId: "Start logging",
                    x: -20,
                    y,
                    onClick: () => {
                        if (DistributedLoggingScreen.streamingDone) {
                            DistributedLoggingScreen.streamDataBack = false

                            this.app.popScene()
                            this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.DistributedLogging))
                        }
                    }
                }),

                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "radio_set_group",
                    ariaId: "Start streaming",
                    x: 20,
                    y,
                    onClick: () => {
                        if (DistributedLoggingScreen.streamingDone) {
                            DistributedLoggingScreen.streamDataBack = true

                            this.app.popScene()
                            this.app.pushScene(new SensorSelect(this.app, CursorSceneEnum.DistributedLogging))
                        }
                    },
                    flipIcon: true
                }),

                new Button({
                    parent: null,
                    style: ButtonStyles.Transparent,
                    icon: "largeDisk",
                    ariaId: "View real-time data",
                    x: 60,
                    y,
                    onClick: () => {
                        if (DistributedLoggingScreen.showTabularData) {
                            this.app.popScene();
                            this.app.pushScene(new TabularDataViewer(this.app, function() { this.app.popScene(); this.app.pushScene(new DistributedLoggingScreen(this.app)) }));
                        }
                    },
                })
            ]])
        }

        draw() {
            Screen.fillRect(
                Screen.LEFT_EDGE,
                Screen.TOP_EDGE,
                Screen.WIDTH,
                Screen.HEIGHT,
                0xc
            )

            switch (this.uiState) {
                case UI_STATE.SHOWING_OPTIONS: {
                    switch (this.distributedLogger.radioMode) {
                        case RADIO_LOGGING_MODE.UNCONFIGURED: {
                            screen().printCenter(
                                "Searching for Microbits...",
                                2
                            )
                            break;
                        }

                        case RADIO_LOGGING_MODE.COMMANDER: {
                            screen().printCenter(
                                "Commander Mode",
                                2
                            )

                            this.navigator.drawComponents();
                            break;
                        }

                        case RADIO_LOGGING_MODE.TARGET: {
                            const connectedText = "Connected to Commander,"
                            const asMicrobit = "as Microbit " + this.distributedLogger.id + "."

                            screen().print(
                                connectedText,
                                Screen.HALF_WIDTH - ((connectedText.length * font.charWidth) >> 1),
                                2
                            )

                            // Left-aligned with above text
                            screen().print(
                                asMicrobit,
                                Screen.HALF_WIDTH - ((connectedText.length * font.charWidth) >> 1),
                                12
                            )
                            break;
                        }

                        default:
                            break;
                    }
                    break;
                } // end of UI_STATE.SHOWING_OPTIONS case

                case UI_STATE.SHOWING_CONNECTED_MICROBITS: {
                    screen().printCenter("Microbits connected", 2)
                    let y = 15
                    this.targetIDCache.forEach((id) => {
                        if (id != UNINITIALISED_MICROBIT_ID) {
                            screen().print(
                                "Microbit " + id,
                                1,
                                y
                            )
                            y += 10
                        }
                    })

                    break;
                } // end of UI_STATE.SHOWING_CONNECTED_MICROBITS case
            }
            super.draw()
        }
    }
}
