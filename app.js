const express   = require('express');
const os        = require('os');
const multer    = require('multer');
const fs        = require('fs-extra'); 
const path      = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

async function listFilesRecursively(dir) {
    let files = [];
    const items = await fs.readdir(
        dir, 
        { withFileTypes: true }
    );
    for (const item of items) {
        const fullPath = path.join(
            dir, 
            item.name
        );
        if (item.isDirectory()) {
            files = files.concat(
                await listFilesRecursively(fullPath)
            );
        } else {
            files.push(fullPath); 
        }
    }
    return files;     
}  


async function listFiles(dir) 
{
    let files = [];
    const items = await fs.readdir
    (
        dir, 
        { withFileTypes: true }
    );
    for (const item of items) 
    {
        const fullPath = path.join(dir, item.name);
        if (item.isFile()) 
        {
            files.push(fullPath);
        }
    }
    return files;
}

     
const setStorage = (req, res, next) => {
    const subfolder = req.params.subfolder;
    const storage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            const uploadPath = subfolder ? path.join('./public/mymediafiles', subfolder) : './public/mymediafiles';
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    });
    req.upload = multer({ storage: storage }).array('pdfFiles');
    next();
};

app.post('/upload/:subfolder?', setStorage, (req, res) => {
    req.upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(500).json({ error: 'Error uploading files.' });
        } else if (err) {
            console.error('Unknown error during upload:', err);
            return res.status(500).json({ error: 'Error uploading files.' });
        }
        res.status(200).json({ message: 'Files uploaded successfully!' });
    });
});

app.delete('/delete/*', async (req, res) => {
    const filename = req.params[0]; // Do not decode
    const filePath = path.join(__dirname, 'public', 'mymediafiles', filename);
    try {
        const exists = await fs.pathExists(filePath);
        if (!exists) {
            return res.status(404).send('File not found.');
        }
        await fs.unlink(filePath);
        res.status(200).send('File deleted successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting file.');
    }
});

app.put('/rename', express.json(), async (req, res) => {
    const { oldFilename, newFilename } = req.body;
    const oldFilePath = path.join(__dirname, 'public', 'mymediafiles', decodeURIComponent(oldFilename));
    const newFilePath = path.join(__dirname, 'public', 'mymediafiles', decodeURIComponent(newFilename));

    try {
        const exists = await fs.pathExists(oldFilePath);
        if (!exists) {
            return res.status(404).send('File not found.');
        }

        // Ensure destination directory exists before renaming
        const newDirectory = path.dirname(newFilePath);
        await fs.ensureDir(newDirectory);

        await fs.rename(oldFilePath, newFilePath);

        // Return the updated folder structure
        const newRelativePath = path.relative('./public/mymediafiles', newFilePath);
        res.status(200).json({ message: 'File renamed successfully!', newRelativePath });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error renaming file.');
    }
});


app.put('/move', express.json(), async (req, res) => {
    const { oldFilename, newFolder } = req.body;
    const oldFilePath = path.join(__dirname, 'public', 'mymediafiles', decodeURIComponent(oldFilename));
    const newFilePath = path.join(__dirname, 'public', 'mymediafiles', newFolder, path.basename(decodeURIComponent(oldFilename)));

    try {
        const exists = await fs.pathExists(oldFilePath);
        if (!exists) {
            return res.status(404).send('File not found.');
        }

        // Check if the destination file already exists
        const destExists = await fs.pathExists(newFilePath);
        if (destExists) {
            return res.status(409).send('Destination file already exists.');
        }
 
        // Ensure destination directory exists before moving
        await fs.ensureDir(path.dirname(newFilePath));

        await fs.move(oldFilePath, newFilePath);
        res.status(200).send('File moved successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error moving file.');
    }
});

  

app.get('/list', async (req, res) => {
    try {
        const files = await listFilesRecursively('./public/mymediafiles');
        const relativeFiles = files.map(file => path.relative('./public/mymediafiles', file));
        res.json(relativeFiles);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing files.');
    }
});

/*
app.get('/list/uncategorized', async (req, res) => {
    try {
        const files = await listFilesExcludingSubdirectories('./public/mymediafiles');
        const relativeFiles = files.map(file => path.relative('./public/mymediafiles', file));
        res.json(relativeFiles);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing files.');
    }
});
*/

   
async function listFilesExcludingSubdirectories(dir) {
    let files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}
     

app.get('/list/:subfolder', async (req, res) => {
    const subfolder = req.params.subfolder;
    try {
        const files = await listFilesRecursively(`./public/mymediafiles/${subfolder}`);
        const relativeFiles = files.map(file => path.relative('./public/mymediafiles', file));
        res.json(relativeFiles);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing files.');
    }
}); 

app.get('/subfolders', async (req, res) => {
    try {
        const subfolders = [];
        const items = await fs.readdir('./public/mymediafiles', { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                subfolders.push(item.name);
            }
        }
        res.json(subfolders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing subfolders.');
    }
});

app.listen(PORT, '0.0.0.0', async () => {
    const ipAddress = getIPAddress();
    const url = `http://${ipAddress}:${PORT}`;
    console.log(`Server is running on ${url}`);
    
    // Use dynamic import to open the browser
    const { default: open } = await import('open');
    open(url);
});

function getIPAddress() { 
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
        for (const alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}
