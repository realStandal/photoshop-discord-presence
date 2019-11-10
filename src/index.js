// ============================================

//       Photoshop Discord Rich Presence
//              By: realStandal
//              Version: 1.0.0

// ============================================

/**
 * 
 *  Notes and other tid-bits
 * 
 *  On error from either "find-process" or "@arcsine/win-info", the Discord Client will display a presence of "Idling".
 *      The typical error is "Unhandled Exception: System.Exception: Screens not found" thrown by @arcsine/win-info
 *      when a window is minimized, and thus has no screen properties.
 * 
 *      I'm taking the liberty to extrpolate out most people minimize Photoshop when they're idling; regardless of if they have a document open.
 * 
 *  The @arcsine/win-info library currently only works for Windows and MacOS; though I'm not sure if Photoshop is available on Linux.
 *  If it is, I'd guess it's through Wine which may return the window properties in a way you can still read with this library.
 *  If someone comes along and wants to create a PR or issue, feel free.
 * 
 */

// Lil flav-a-flav
console.log("[Photoshop Discord Presence] Starting script... Loading magic...");
// Dependencies
const find_process = require('find-process');
const win_info = require('@arcsine/win-info');
const discord_client = require('discord-rich-presence')('631557255862681610');

// Constants - Configuration if you will
const Process_Name = "Photoshop.exe";

// Global variables
let Photoshop_App,
    Photoshop_Win,
    Idling = true,
    Project_Time,
    Project_Title;

setInterval(() => Heartbeat(), 15000);
function Heartbeat()
{
    try {

        find_process("name", "Photoshop")
            .then((value) => OnRecieveProcessList(value))   // Forward the list of processes with the name "Photoshop" to the handler function.
            .catch((err) => OnProcessRejected(err));        // Forward a possible rejection and error to a rejection handler.

    } catch(err) {

        console.log(err.stack || err);
        UpdateDiscordPresenceIdle();

    }
}


// ===================

// Process Handling

// ===================

function OnRecieveProcessList(list)
{
    list.forEach(process => {
        if(process.name == Process_Name)
        {
            Photoshop_App = process;
        }
    });

    UpdateWindow();
}

function OnProcessRejected(error)
{
    console.log(error.stack || error);

    UpdateDiscordPresenceIdle();
}

// ===================

// Window Handling

// ===================

function UpdateWindow()
{
    try{

        win_info.getByPid(Photoshop_App.pid)
            .then((value) => OnUpdateWindow(value))    // Pass along window information to update handler.
            .catch((err) => OnWindowRejected(err));    // Forward possible errors to a rejection handler.

    } catch(err) {

        console.log(err.stack || err);
        UpdateDiscordPresenceIdle();

    }
}

function OnUpdateWindow(response)
{
    if(response)
    {
        Photoshop_Win = response;

        UpdateDiscordPresence();
    }
}

function OnWindowRejected(error)
{
    console.log(error.stack || error);

    UpdateDiscordPresenceIdle();
}

// ===================

// Discord Prescense

// ===================

function UpdateDiscordPresence()
{
    // Either the process or window is undefined.
    //      Photoshop may not be running,
    //      The Photoshop window maybe minimized
    if(Photoshop_App == undefined || Photoshop_Win == undefined)
        return;

    // Check if the title contains "Adobe Photoshop".
    // Indicates a project is NOT currently open and being worked on.
    if(Photoshop_Win.title.startsWith("Adobe Photoshop"))
    {
        Idling = true;

        UpdateDiscordPresenceIdle();
        return;
    }
    // Otherwise the title will contain the name of a user's current project and data about its configuration:
    else
    {
        if(Idling == true)
        {
            Idling = false;                 // Indicate the user is no longer idling

            Project_Time = new Date();      // Update the Project_Time variable with the current time.
        }

        let trim_end = Photoshop_Win.title.search("[@] [0-9]+%");           // Search for the begining of the document's metadata. I used RegEx so having a title such as: this is @ my title.psdc can still be displayed.
        let new_project_title = Photoshop_Win.title.slice(0, trim_end);     // Slice out a user's project; it's held in a new variable to compare in-case a user switches projects.
        // Compare project titles. Comparing the current setInterval() cycle (new_project_title) against the one done 15 seconds ago (project_title)
        if(new_project_title != Project_Title)
        {
            Project_Time = new Date();      // Update Project_Time. Doesn't matter if it was done previously as well, it'll be less than seconds difference.
            Project_Title = new_project_title;      // Update project title; done each time.
        }

    }

    discord_client.updatePresence({
        largeImageKey: "photoshop_large",
        largeImageText: "Adobe Photoshop",
        details: `Working on ${Project_Title}`,
        startTimestamp: Project_Time
    });
}

function UpdateDiscordPresenceIdle()
{
    discord_client.updatePresence({
        details: Idling,
    }); 
}

// ===================

// Uncaught Error Handling

// ===================

process.on('uncaughtException', (err) => {
    console.log(err.stack || err);

    UpdateDiscordPresenceIdle();
})