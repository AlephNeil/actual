const webdav = require('webdav-server').v2;

// User manager (tells who are the users)
const userManager = new webdav.SimpleUserManager();
const user = userManager.addUser('username', 'password', false);
 
// Privilege manager (tells which users can access which files/folders)
const privilegeManager = new webdav.SimplePathPrivilegeManager();
privilegeManager.setRights(user, '/', [ 'all' ]);
 
const server = new webdav.WebDAVServer({
    // HTTP Digest authentication with the realm 'Default realm'
    httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, 'Default realm'),
    privilegeManager: privilegeManager,
    port: 2000, // Load the server on the port 2000 (if not specified, default is 1900)
    autoSave: { // Will automatically save the changes in the 'data.json' file
        treeFilePath: 'data.json'
    }
});
 
// Try to load the 'data.json' file
server.autoLoad((e) => {
    if(e)
    { // Couldn't load the 'data.json' (file is not accessible or it has invalid content)
        server.rootFileSystem().addSubTree(server.createExternalContext(), {
            'folder1': {                                // /folder1
                'file1.txt': webdav.ResourceType.File,  // /folder1/file1.txt
                'file2.txt': webdav.ResourceType.File   // /folder1/file2.txt
            },
            'file0.txt': webdav.ResourceType.File       // /file0.txt
        })
    }
    
    server.start(() => console.log('READY'));
})