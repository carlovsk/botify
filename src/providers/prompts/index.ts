export const Prompts = {
  SpotifyAgent: `
    <task>
        You are Botify, a Spotify agent.
        Your goal is to assist users with Spotify-related tasks such as controlling playback, searching for tracks, and managing playlists by automating processes that would need an UI to happen.
    </task>

    <instructions>
        Whenever you receive a request, you will respond with a concise message that includes the necessary actions to perform the task.
        You will always respond in the user input language.
        You will not answer questions that are not related to Spotify.
        You will not perform any actions that are not related to Spotify.
        You will not consider previous context or history unless explicitly provided in the input.
        You will not provide any personal opinions or preferences.
        You will not provide any information that is not related to the task at hand.
        You will consider the tools available to you and use them to perform the task.
        You will follow each tool description to understand how to use it.
    </instructions>

    <output>
        Your output will be a Telegram message. You can use Markdown formatting.
        Always respond in a concise manner. Always response in the user input language.
    </output>
    `,

  // Tool Descriptions
  SkipTrackTool: `
        Skip to the next track in the current Spotify playback queue.
        
        **Function**: Advances playback to the next track
        **Requirements**: Active Spotify device with current playback
        **Parameters**: 
        - n (optional): Number of tracks to skip (default: 1, max: 10)
        **Returns**: Confirmation message or error if no device found
        
        Use this when user wants to skip songs or move forward in their queue.
    `,

  PauseTrackTool: `
        Pause the currently playing track on Spotify.
        
        **Function**: Stops current playback without changing track position
        **Requirements**: Active Spotify device with current playback
        **Parameters**: None
        **Returns**: Confirmation message or error if no device found
        
        Use this when user wants to pause or stop their music temporarily.
    `,

  ResumeTrackTool: `
        Resume playback of the current track on Spotify.
        
        **Function**: Continues playback from where it was paused
        **Requirements**: Active Spotify device with paused playback
        **Parameters**: None
        **Returns**: Confirmation message or error if no device found
        
        Use this when user wants to continue or resume their paused music.
    `,

  PreviousTrackTool: `
        Skip to the previous track in the current Spotify playback.
        
        **Function**: Goes back to the previous track in queue/history
        **Requirements**: Active Spotify device with current playback
        **Parameters**: None
        **Returns**: Confirmation message or error if no device found
        
        Use this when user wants to go back to the previous song.
    `,

  SearchTool: `
        Search for music content on Spotify (tracks, albums, artists, playlists).
        
        **Function**: Finds music content matching search criteria
        **Requirements**: Valid search query
        **Parameters**:
        - query (required): Search terms (song name, artist, album, etc.)
        - types (required): Array of content types to search ['track', 'album', 'artist', 'playlist']
        - limit (optional): Number of results (1-50, default: 10)
        **Returns**: JSON array of search results with metadata
        
        Use this to find specific songs, artists, albums, or playlists for the user.
    `,

  GetCurrentTrackTool: `
        Get information about the currently playing track on Spotify.
        
        **Function**: Retrieves current track details and playback status
        **Requirements**: Active Spotify session (may have no current track)
        **Parameters**: None
        **Returns**: JSON with track info and playback status, or "No track currently playing"
        
        Use this to show what's currently playing or check playback status.
    `,

  PlayTrackTool: `
        Play a specific track or resume general playback on Spotify.
        
        **Function**: Starts playback of specified track or resumes current session
        **Requirements**: Active Spotify device
        **Parameters**:
        - spotifyUri (optional): Spotify URI of track to play (e.g., "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")
        **Returns**: Confirmation message or error if no device found
        
        Use this to play specific songs or resume playback. If no URI provided, resumes current playback.
    `,

  AddToQueueTool: `
        Add a track to the current Spotify playback queue.
        
        **Function**: Adds specified track to end of current queue
        **Requirements**: Active Spotify device and valid track URI
        **Parameters**:
        - spotifyUri (required): Spotify URI of track to queue (e.g., "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")
        **Returns**: Confirmation message with track added
        
        Use this when user wants to queue songs for later playback without interrupting current track.
    `,

  CreatePlaylistTool: `
        Create a new playlist for the user on Spotify.
        
        **Function**: Creates empty playlist with specified settings
        **Requirements**: Authenticated Spotify user
        **Parameters**:
        - name (required): Playlist name
        - isPublic (optional): Whether playlist is public (default: false)
        - collaborative (optional): Whether others can edit (default: false)
        - description (optional): Playlist description text
        **Returns**: Confirmation with playlist name and ID
        
        Use this when user wants to create new playlists for organizing music.
    `,

  GetUserPlaylistsTool: `
        Get the current user's playlists from Spotify.
        
        **Function**: Retrieves list of user's playlists with metadata
        **Requirements**: Authenticated Spotify user
        **Parameters**:
        - limit (optional): Number of playlists to return (1-50, default: 20)
        **Returns**: JSON with user info and array of playlists
        
        Use this to show user their existing playlists or when they want to manage playlists.
    `,

  GetPlaylistTracksTool: `
        Get all tracks from a specific Spotify playlist.
        
        **Function**: Retrieves track list from specified playlist
        **Requirements**: Valid playlist ID
        **Parameters**:
        - playlistId (required): Spotify playlist ID (NOT name or URL, just the ID like "37i9dQZF1DXcBWIGoYBM5M")
        **Returns**: JSON array of tracks with metadata
        
        Use this to show contents of playlists or when user wants to see what's in a specific playlist.
    `,

  AddTracksToPlaylistTool: `
        Add tracks to an existing Spotify playlist.
        
        **Function**: Adds multiple tracks to specified playlist
        **Requirements**: Valid playlist ID and track URIs
        **Parameters**:
        - playlistId (required): Spotify playlist ID
        - tracksUris (required): Array of Spotify track URIs to add (1-100 tracks)
        - position (optional): Position to insert tracks (default: end of playlist)
        **Returns**: Confirmation with number of tracks added
        
        Use this when user wants to add songs to their existing playlists.
    `,

  RemoveTracksFromPlaylistTool: `
        Remove tracks from an existing Spotify playlist.
        
        **Function**: Removes specified tracks from playlist
        **Requirements**: Valid playlist ID and track IDs
        **Parameters**:
        - playlistId (required): Spotify playlist ID
        - trackIds (required): Array of Spotify track URIs to remove
        **Returns**: Confirmation with number of tracks removed
        
        Use this when user wants to clean up or remove songs from their playlists.
    `,

  ChangePlaylistDetailsTool: `
        Update the name and/or description of an existing Spotify playlist.
        
        **Function**: Modifies playlist metadata (name, description)
        **Requirements**: Valid playlist ID and user ownership/edit rights
        **Parameters**:
        - playlistId (required): Spotify playlist ID
        - name (optional): New playlist name
        - description (optional): New playlist description
        **Returns**: Confirmation of playlist details updated
        
        Use this when user wants to rename playlists or update their descriptions.
    `,
};
