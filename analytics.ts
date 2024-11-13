namespace microdata {
    export interface AnalyticsEvent {
        type: "event"
        msg: string
        data?: { [name: string]: string | number } 
    }

    /**
     * Sends an event to analytics.
     */
    //% shim=TD_NOOP
    export function reportEvent(
        event: string,
        data?: { [name: string]: string | number }
    ) {
        const msg: AnalyticsEvent = {
            type: "event",
            msg: event,
        }
        if (data) msg.data = data
        report(msg)
    }

    /**
     * Sends an analytics message
     * @param msg
     */
    //% shim=TD_NOOP
    function report(msg: AnalyticsEvent) {

    }
}
