/**
 * ============================================================================
 * MAX/MSP CUE MANAGEMENT SYSTEM
 * ============================================================================

 * GENERAL DESCRIPTION:
 * This JavaScript code provides a comprehensive cue management system for Max/MSP.
 * It allows you to create, organize, and recall cues, where each cue can contain
 * multiple events of different types (e.g., routing, volume, effects settings).
 * 
 * You can store different configurations (events) in numbered cues, then recall them instantly. Each cue
 * is a container for various event types, and each event type can only appear
 * once per cue (updating replaces the previous data).
 * 
 * Key features:
 * - Sequential cue numbering (1, 2, 3...) with no gaps allowed
 * - Each cue can contain multiple events with different types
 * - Events are identified by type (string) and contain data (any format, but within a Max symbol)
 * - Persistent storage via Max dictionary
 * - Insert/delete operations automatically renumber subsequent cues
 * - Copy/move events between cues
 * 
 * ============================================================================
 * MAX MESSAGES REFERENCE:
 * ============================================================================
 * 
 * add <cue> <type> <data>
 *     Add or update an event in a cue
 *     Example: add 1 routing "0 0 1 0 0 1"
 *     - If cue exists and event type exists: updates the data
 *     - If cue exists and event type is new: adds the event
 *     - If cue doesn't exist: creates new cue with the event
 * 
 * insertCue <cue> <type> <data>
 *     Insert a new cue at a specific position, shifting others up
 *     Example: insertCue 2 volume 0.75
 *     - Inserts at position 2, shifts old cue 2 to 3, etc.
 *     - Updates all parent cue references automatically
 * 
 * deleteCue <cue>
 *     Delete an entire cue and all its events
 *     Example: deleteCue 3
 *     - Removes the cue and shifts subsequent cues down
 *     - Updates parent cue references automatically
 * 
 * deleteEvent <cue> <type>
 *     Delete a specific event from a cue
 *     Example: deleteEvent 1 routing
 *     - Cue remains, only the specified event is removed
 * 
 * copyEvent <sourceCue> <type> <targetCue>
 *     Copy an event from one cue to another
 *     Example: copyEvent 1 routing 3
 *     - Source cue keeps the event, target gets a copy
 *     - Fails if event type already exists in target
 * 
 * moveEvent <sourceCue> <type> <targetCue>
 *     Move an event from one cue to another
 *     Example: moveEvent 1 routing 3
 *     - Copies to target, then deletes from source
 *     - Atomic operation: only deletes if copy succeeds
 * 
 * getCue <cue>
 *     Recall all events from a cue (outputs to outlet 0)
 *     Example: getCue 1
 *     - Outputs: [eventData, "send eventType"] for each event
 *     - Use with route or forward objects to distribute events
 * 
 * printAll
 *     Print all cues and their events to the Max console
 *     Example: printAll
 *     - Useful for debugging and viewing the entire cue list
 * 
 * load
 *     Load cue data from the Max dictionary
 *     Example: load
 *     - Reads from the "cue" dictionary
 *     - Clears existing data before loading
 *     - Use for persistent storage between Max sessions
 * 
 * ============================================================================
 */

const maxAPI = require("max-api");
const fs = require("fs");


/**
 * General Object: container of Cues
 * Stores all cues in an array structure
 */
let cueObj = { 
     
    filename: "null", // the file name of the Object
    arrayOfCues: []
};

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Class Cue: Represents a single cue that can contain multiple events
 * Each cue is a collection point for various event types (routing, volume, etc.)
 */
class Cue {
    constructor() { 
        this.arrayEvents = []; 
    }
    
    /**
     * Add an event to this cue
     * @param {Event} e - The event object to add
     */
    addEvent(e){ 
        this.arrayEvents.push(e); 
    }
}

/**
 * Class Event: Represents a single event with a type and data
 * Each event belongs to a parent cue and contains typed data
 */
class Event {
    /**
     * @param {number} _cue - The cue number this event belongs to (1-indexed)
     */
    constructor(_cue) {
        this.parentCue = _cue; // index associated to the cue
        this.eventType = null;
        this.eventData = null;
    }
    
    // Setters
    /**
     * Set the event type
     * @param {string} e - The type identifier (e.g., "routing", "volume")
     */
    setType(e){ 
        this.eventType = e; 
    }
    
    /**
     * Set the event data
     * @param {*} d - The data payload for this event
     */
    setData(d){ 
        this.eventData = d; 
    }
    
    // Getters
    /**
     * Get the event data
     * @returns {*} The event data
     */
    getData(){ 
        return this.eventData; 
    }
    
    /**
     * Get the parent cue number
     * @returns {number} The cue number (1-indexed)
     */
    getCue(){ 
        return this.parentCue; 
    }
    
    /**
     * Get the event type
     * @returns {string} The event type
     */
    getType(){ 
        return this.eventType; 
    }
    
    /**
     * Create a copy of this event for a different cue
     * @param {number} newCueNumber - The target cue number for the copy
     * @returns {Event} A new Event object with copied data
     */
    copyToCue(newCueNumber) {
        const copiedEvent = new Event(newCueNumber);
        copiedEvent.setType(this.eventType);
        copiedEvent.setData(this.eventData);
        return copiedEvent;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================


function getDateTime() {

    const date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "." + month + "." + day + "." + hour + "." + min + "." + sec;
}


/**
 * Validate that a cue number is within acceptable bounds
 * Cues must be > 0 and sequential (no gaps allowed)
 * @param {number} cue - The cue number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function checkCueBounds(cue){
    const cuesNumber = cueObj.arrayOfCues.length;
    if(cue <= 0) {
        error(`\n Cue number must be > 0.`);
        return false;
    } else if (cue > cuesNumber + 1){
        error(`\n Cue number must be sequential.
        At the moment there are ${cuesNumber} cues.
        Next available cue is number: ${cuesNumber + 1}`);
        return false;
    } else {
        return true;
    }
}

/**
 * Check if an event type exists in a cue and update it, or add it if new
 * Prevents duplicate event types within the same cue
 * @param {Event} event - The event to check and potentially add/update
 */
function checkEventAndUpdate(event) {
    const currCue = event.getCue();
    const currCueIndex = currCue - 1;
    const currCueObj = cueObj.arrayOfCues[currCueIndex];
    const currEventType = event.getType();
    
    const existingIndex = currCueObj.arrayEvents.findIndex(e => e.getType() === currEventType);
    
    if (existingIndex !== -1) {
        // Event type exists: replace with new data
        maxAPI.post(`\n Changed data of the Existing Event of Type: ${currEventType}
                    on the Existing Cue: ${currCue}
                    with Data: ${event.getData()}`);
        currCueObj.arrayEvents[existingIndex] = event;
    } else {
        // Event type is new: add to cue
        currCueObj.addEvent(event);
        maxAPI.post(`\n Added New Event of Type: ${event.getType()} 
                    on the Existing Cue: ${currCue}
                    with Data: ${event.getData()}`);
    }
}

/**
 * Create a new cue and add the first event to it
 * @param {Event} event - The initial event for the new cue
 */
function createNewCueAndAddEvent(event){
    const newCue = new Cue();
    newCue.addEvent(event);
    cueObj.arrayOfCues.push(newCue);
    maxAPI.post(` \n Added New Event of Type: ${event.getType()} 
            on New Cue : ${event.getCue()}
            with Data : ${event.getData()}`);
}

// ============================================================================
// MAX FUNCTIONS (Messages from Max/MSP)
// ============================================================================

/**
 * Add or update an event in a cue
 * Usage from Max: add cueNumber eventType eventData
 * Example: add 1 routing "0 0 1 0 0 1"
 * 
 * Behavior:
 * 1. If cue exists and event type exists: Update the event data
 * 2. If cue exists and event type is new: Add the event to the cue
 * 3. If cue doesn't exist: Create new cue with the event
 * 
 * @param {number} cue - The cue number (1-indexed)
 * @param {string} type - The event type identifier
 * @param {*} data - The event data payload
 */

maxAPI.addHandler("add", (cue, type, data) => {
    // updateDict(); // Load current state from dict
    
    if(!checkCueBounds(cue)) return;

    const newEvent = new Event(cue);
    newEvent.setType(type);
    newEvent.setData(data);
    
    if(cueObj.arrayOfCues[cue-1]){      // If the cue exists
        checkEventAndUpdate(newEvent);   // Case 1 or 2
    } else {                             // If the cue does not exist
        createNewCueAndAddEvent(newEvent); // Case 3
    }
    exportBackup();

    // updateDict(); // Save updated state to dict
});

/**
 * Delete an entire cue and all its events
 * Usage from Max: deleteCue cueNumber
 * Example: deleteCue 2
 * 
 * WARNING: This does NOT update parent cue numbers for subsequent cues
 * This may cause inconsistencies if cues reference their numbers
 * 
 * @param {number} cue - The cue number to delete (1-indexed)
 */
maxAPI.addHandler("deleteCue", (cue) => {
    const index = cue-1;
    if(!cueObj.arrayOfCues[index]){
        error(`\n Cue with number ${cue} does not exist`);
        return;
    } 
    cueObj.arrayOfCues.splice(index, 1);
    
    // BUG FIX: Update parent cue numbers for all cues after deletion
    for(let i = index; i < cueObj.arrayOfCues.length; i++){
        const updatedCueNumber = i + 1;
        cueObj.arrayOfCues[i].arrayEvents.forEach(event => {
            event.parentCue = updatedCueNumber;
        });
    }
    
    maxAPI.post(`\n Deleted Cue ${cue}.
        Now there are ${cueObj.arrayOfCues.length} cues`);
    // updateDict();
});

/**
 * Delete a specific event from a cue
 * Usage from Max: deleteEvent cueNumber eventType
 * Example: deleteEvent 1 routing
 * 
 * @param {number} cue - The cue number (1-indexed)
 * @param {string} type - The event type to delete
 */
maxAPI.addHandler("deleteEvent",(cue, type)=>{
    const index = cue-1;
    const currCueObj = cueObj.arrayOfCues[index];

    if(!currCueObj){
        error(`\n Cue with number ${cue} does not exist`);
        return;
    } 

    const eventIndex = currCueObj.arrayEvents.findIndex(e => {
        return e.getType() === type;
    });

    if(eventIndex < 0){
        error(`\n Event of Type ${type} does not exist in the Cue ${cue}`);
        return;
    } 
  
    maxAPI.post(`\n Deleted Event of Type: ${type}
        in Cue: ${cue}
        with Data : ${currCueObj.arrayEvents[eventIndex].getData()}`);

    currCueObj.arrayEvents.splice(eventIndex, 1);
    // updateDict();
});

/**
 * Print all cues and their events to the Max console
 * Usage from Max: printAll
 * 
 * Displays a hierarchical view of all cues and their contained events
 */
maxAPI.addHandler("printAll", ()=>{
    if(cueObj.arrayOfCues.length==0) { 
        error(`\n There are no Cues`);
        return;
    }

    for(let i=0; i<cueObj.arrayOfCues.length; i++){
        maxAPI.post(`\n Cue: ${i + 1}`);

        for(let j=0; j<cueObj.arrayOfCues[i].arrayEvents.length; j++){
            maxAPI.post(`\n 
                >  ${cueObj.arrayOfCues[i].arrayEvents[j].eventType}: ${cueObj.arrayOfCues[i].arrayEvents[j].eventData}`);
        }
    }
});

/**
 * Recall and output all events from a specific cue
 * Usage from Max: getCue cueNumber
 * Example: getCue 1
 * 
 * Outputs each event's data with a routing message for Max patching
 * Output format: [eventData, "send eventType"]
 * 
 * @param {number} cue - The cue number to recall (1-indexed)
 */
maxAPI.addHandler("getCue", (cue) => {
    const index = cue-1;
    const currentCue = cueObj.arrayOfCues[index];

    if(!currentCue) { 
        error(`\n Cue ${cue} does not exist`);
        return;
    }

    currentCue.arrayEvents.forEach(e => {
        // outlet(0, e.eventData, `send ${e.eventType}`);
        maxAPI.outlet("event", `send ${e.eventType}`);
        maxAPI.outlet("data", e.eventData);
        
    });
});

/**
 * Insert a new cue at a specific position, shifting subsequent cues
 * Usage from Max: insertCue cueNumber eventType eventData
 * Example: insertCue 2 routing "1 0 0 1"
 * 
 * This will insert a new cue at position 2 and shift cue 2, 3, 4... to 3, 4, 5...
 * All parent cue references are updated accordingly
 * 
 * @param {number} cue - The position to insert the new cue (1-indexed)
 * @param {string} type - The event type for the initial event
 * @param {*} data - The event data for the initial event
 */
maxAPI.addHandler("insertCue", (cue, type, data)=> {
    if(!checkCueBounds(cue)) return;

    const index = cue-1;
    const newCue = new Cue();
    const newEvent = new Event(cue);

    newEvent.setType(type);
    newEvent.setData(data);
    newCue.addEvent(newEvent);

    // Insert the new cue and shift existing elements
    cueObj.arrayOfCues.splice(index, 0, newCue);
    
    // CRITICAL: Update parent cue numbers for all cues after the insertion
    for(let i = index + 1; i < cueObj.arrayOfCues.length; i++){
        const updatedCueNumber = i + 1;
        cueObj.arrayOfCues[i].arrayEvents.forEach(event => {
            event.parentCue = updatedCueNumber;
        });
    }
    
    maxAPI.post(`\n Inserted New Event of Type ${newEvent.getType()}
            in a New Cue ${cue}
            and updated the array of Cues`);
    // updateDict();
});

/**
 * Copy an event of a specific type from one cue to another
 * Usage from Max: copyEvent sourceCue eventType targetCue
 * Example: copyEvent 1 routing 3
 * 
 * Will fail if:
 * - Source cue doesn't exist
 * - Target cue doesn't exist
 * - Event type not found in source cue
 * - Event type already exists in target cue
 * 
 * @param {number} sourceCue - The cue number to copy from (1-indexed)
 * @param {string} type - The type of event to copy
 * @param {number} targetCue - The cue number to copy to (1-indexed)
 */
maxAPI.addHandler("copyEvent", (sourceCue, type, targetCue) => {
    const sourceIndex = sourceCue - 1;
    const targetIndex = targetCue - 1;

    const sourceCueObj = cueObj.arrayOfCues[sourceIndex];
    const targetCueObj = cueObj.arrayOfCues[targetIndex];

    if(!sourceCueObj){
        error(`\n Source Cue ${sourceCue} does not exist`);
        return;
    }

    if(!targetCueObj){
        error(`\n Target Cue ${targetCue} does not exist`);
        return;
    }

    // Find the event to copy in the source cue
    const eventToCopy = sourceCueObj.arrayEvents.find(e => e.getType() === type);
    
    if(!eventToCopy){
        error(`\n Event of Type "${type}" not found in Cue ${sourceCue}`);
        return;
    }

    // Check if event type already exists in target cue
    const existsInTarget = targetCueObj.arrayEvents.some(e => e.getType() === type);
    
    if(existsInTarget){
        error(`\n Event of Type "${type}" already exists in Cue ${targetCue}. Copy aborted.`);
        return;
    }

    // Copy the event to the target cue
    const copiedEvent = eventToCopy.copyToCue(targetCue);
    targetCueObj.addEvent(copiedEvent);
    
    maxAPI.post(`\n Copied Event of Type "${type}" 
            from Cue ${sourceCue} to Cue ${targetCue}
            with Data: ${copiedEvent.getData()}`);

    // updateDict();   
});

/**
 * Move an event from one cue to another (copy then delete from source)
 * Usage from Max: moveEvent sourceCue eventType targetCue
 * Example: moveEvent 1 routing 3
 * 
 * This is a compound operation that:
 * 1. Copies the event to the target cue
 * 2. Deletes it from the source cue (only if copy succeeds)
 * 
 * @param {number} sourceCue - The cue number to move from (1-indexed)
 * @param {string} type - The type of event to move
 * @param {number} targetCue - The cue number to move to (1-indexed)
 */
maxAPI.addHandler("moveEvent", (sourceCue, type, targetCue) => {
    copyEvent(sourceCue, type, targetCue); // Copy first
    
    const targetIndex = targetCue - 1;
    const targetCueObj = cueObj.arrayOfCues[targetIndex];
    
    // Only delete from source if copy was successful
    if(targetCueObj && targetCueObj.arrayEvents.some(e => e.getType() === type)){
        deleteEvent(sourceCue, type);
        maxAPI.post(`\n Moved Event of Type "${type}" from Cue ${sourceCue} to Cue ${targetCue}`);
    }
    exportBackup();
});

/**
 * Load cue data from the Max dictionary
 * Usage from Max: load
 * 
 * Reads the "cue" dictionary, parses it, and reconstructs the cueObj structure
 * This allows persistence of cue data between Max sessions
 * 
 * IMPORTANT: This clears all existing cues before loading
 */
// maxAPI.addHandler("load", ()=>{
//     cueObj.arrayOfCues = []; // Clear existing cues

//     // const json = dict.stringify(); // Convert dict to JSON string
//     const JSONobj = JSON.parse(json); // Parse JSON to JS object

//     // Reconstruct the cue structure from JSON
//     for(let i = 0; i < JSONobj.arrayOfCues.length; i++){
//         const newCue = new Cue();
//         for(let j = 0; j < JSONobj.arrayOfCues[i].arrayEvents.length; j++){
//             let currEvent = JSONobj.arrayOfCues[i].arrayEvents[j];
//             let newEvent = new Event(i + 1); // Use 1-indexed cue numbers
//             newEvent.setType(currEvent.eventType);
//             newEvent.setData(currEvent.eventData);
//             newCue.addEvent(newEvent);
//         }
//         cueObj.arrayOfCues.push(newCue);
//     }  
//     // updateDict(); // Ensure dict is synchronized
// });

/**
 * load the desired JSON file in Sync way 
 * and parse the JSON file to create the objects and fill the cueObj.cues 
 */
maxAPI.addHandler("import", (filename) => {
	// const rawdata = fs.readFileSync(filename);
	
	fs.readFile(filename, (err, data) => { 
			if(err) 
				maxAPI.post(`From Node: File not found: ${filename}`);
			else {
				cueObj.filename = filename;
				cueObj.arrayOfCues = []; // delete old cues

				const jsonObj = JSON.parse(data); // loaded JSON file

				// Read the JSON and create the Objects to fill the cueObj.cues 
				for(let i=0; i<jsonObj.arrayOfCues.length; i += 1){
					const newCue = new Cue();

                    for(let j = 0; j < jsonObj.arrayOfCues[i].arrayEvents.length; j++){
                        const currEvent = jsonObj.arrayOfCues[i].arrayEvents[j];
                        const newEvent = new Event(i + 1); // Use 1-indexed cue numbers
            
                        newEvent.setType(currEvent.eventType);
                        newEvent.setData(currEvent.eventData);
                        newCue.addEvent(newEvent);
                    }
					cueObj.arrayOfCues.push(newCue);
				}
				maxAPI.post(`File [ ${filename} ] Loaded`);
			}		
	}); 
    maxAPI.outlet("filename", filename);
});

/**
 * Update the Max dictionary with the current cueObj state
 * This synchronizes the JavaScript object with Max's persistent dictionary
 * 
 * Called automatically after most operations to maintain consistency
 */
// maxAPI.addHandler("updateDict", ()=>{
//     var jsonString = JSON.stringify(cueObj); // Convert cueObj to JSON string 
//     dict.parse(jsonString); // Update the dictionary with the JSON
// });

function exportBackup(){
    const filenameWithDataAndFormat = 'BACKUP.'+cueObj.filename+'.' + getDateTime()+'.json';
	const data = JSON.stringify(cueObj);
	fs.writeFileSync(filenameWithDataAndFormat, data);
    maxAPI.post(`File Saved as BACKUP [ ${filenameWithDataAndFormat} ]`);
    maxAPI.outlet("filename", filenameWithDataAndFormat);
}

function exportInner(filename){
    const filenameWithDataAndFormat = filename+'.json';
	cueObj.filename = filenameWithDataAndFormat;
	const data = JSON.stringify(cueObj);
	fs.writeFileSync(filenameWithDataAndFormat, data);
    maxAPI.outlet("filename", filenameWithDataAndFormat);
}

/**
 * save the cueObj as a JSON file in the same folder
 */
maxAPI.addHandler("export", (filename) => {
	exportInner(filename);
	maxAPI.post(`File Saved as [ ${filename} ]`);
});





