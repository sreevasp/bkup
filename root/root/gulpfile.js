const gulp = require('gulp');
const chalk = require('chalk');

// Gulp tasks & helpers.
const bundleJS = require('./frontend/gulp/core/bundleJS');
const bundleCSS = require('./frontend/gulp/core/bundleCSS');
const { getMinifiedAssets, unlinkSelectedAssets, updateAssetMap } = require('./frontend/gulp/core/assetMapHelper');
const cat = require('./frontend/gulp/core/cat');
const getDependencyList = require('./frontend/gulp/core/getDependencyList');

// Assets.
const filesJS = require('./frontend/gulp/javascript');
const filesCSS = require('./frontend/gulp/css');

// Asset output directory.
const cssDestination = 'httpdocs/assets/css/minified/';
const jsDestination = 'httpdocs/assets/js/minified/';

// [voicesdotcom-styles] Design System
const voicesdotcomDesignSystemFileDirectory = 'frontend/assets/css/voicesdotcom-styles';

/* -------------------------------------------------------
 *                       GULP OPTIONS
 * ------------------------------------------------------- */

const environment =
    process.argv.includes('--development') ? 'development'
        : process.argv.includes('--stage') ? 'stage'
        : 'production';

const uglifyJS = !process.argv.includes('--no-uglifyjs') || environment === 'production';

/* -------------------------------------------------------
 *                       GULP TASKS
 * ------------------------------------------------------- */

/**
 * Generate Javascript tasks.
 */
Object.keys(filesJS).forEach(name => {
    exports[`${name}JS`] = async done => {
        // Generate New Asset Files
        const generatedFiles = [];
        generatedFiles.push(
            bundleJS({
                input: filesJS[name],
                output: `${name}.min.js`,
                destinationFolder: jsDestination,
                deletePreviousFiles: true,
                uglifyJS
            })
        );
        await Promise.all(generatedFiles);

        // Update Asset Map, with all files that exist within the minified directory
        await updateAssetMap();

        // All done this Gulp Task
        done();
    };
});

/**
 * Generate CSS tasks.
 */
Object.keys(filesCSS).forEach(name => {
    exports[`${name}CSS`] = async done => {
        // Generate New Asset Files
        const generatedFiles = [];
        generatedFiles.push(
            bundleCSS({
                input: filesCSS[name],
                output: `${name}.min.css`,
                destinationFolder: cssDestination,
                basePath: __dirname, // !!!!important, needed for building correct paths based on this specific gulpfile.js location...
                deletePreviousFiles: true,
                environment
            })
        );
        await Promise.all(generatedFiles);

        // Update Asset Map, with all files that exist within the minified directory
        await updateAssetMap();

        // All done this Gulp Task
        done();
    };
});

/**
 * Build all JS & CSS Assets.
 */
exports.build = async done => {
    // Get original minified assets, so this group of assets can be safely unlinked after the new ones are created
    const originalAssetFiles = await getMinifiedAssets();

    // Generate New Asset Files
    const generatedFiles = [];
    Object.keys(filesJS).forEach(name => {
        generatedFiles.push(
            bundleJS({
                input: filesJS[name],
                output: `${name}.min.js`,
                destinationFolder: jsDestination,
                deletePreviousFiles: false,
                uglifyJS
            })
        );
    });
    Object.keys(filesCSS).forEach(name => {
        generatedFiles.push(
            bundleCSS({
                input: filesCSS[name],
                output: `${name}.min.css`,
                destinationFolder: cssDestination,
                basePath: __dirname,
                deletePreviousFiles: false,
                environment
            })
        );
    });

    // Update Asset Map, with the newly created files
    const newAssetFiles = await Promise.all(generatedFiles);
    await updateAssetMap(newAssetFiles);
    console.log(
        chalk.green('===> ') + `Updated assetMap.json with ` + chalk.yellow(newAssetFiles.length) + ` new file${newAssetFiles.length !== 1 ? 's' : ''}`
    );

    // Delete old Asset Files, that are no longer linked to the assetMap.json
    // --> Compare differences between these 2 arrays
    const oldAssetFiles = originalAssetFiles.filter(assetFile => !newAssetFiles.includes(assetFile));
    await unlinkSelectedAssets(oldAssetFiles);
    // eslint-disable-next-line no-console
    console.log(
        chalk.green('===> ') + `Deleted ` + chalk.yellow(oldAssetFiles.length) + ` old file${oldAssetFiles.length !== 1 ? 's' : ''}`
    );

    // All done this Gulp Task
    done();
};

/**
 * Watch file changes.
 */
exports.watch = done => {
    cat.display();

    // JS watcher.
    Object.keys(filesJS).forEach(async name => {
        const filesToWatch =
            typeof filesJS[name] === 'string'
                ? await getDependencyList(filesJS[name])
                : filesJS[name];

        const task = exports[`${name}JS`];

        Object.defineProperty(task, 'name', { value: `${name}JS` });

        gulp.watch(filesToWatch, task);
    });

    // CSS watcher.
    Object.keys(filesCSS).forEach(name => {
        const task = exports[`${name}CSS`];

        Object.defineProperty(task, 'name', { value: `${name}CSS` });

        gulp.watch(filesCSS[name], task);
    });

    // Watch for changes done in "voicesdotcom-styles".
    gulp.watch(
        [
            `${voicesdotcomDesignSystemFileDirectory}/**/*.less`,
            `!${voicesdotcomDesignSystemFileDirectory}/legacy/themes/**/*.less`
        ],
        exports.voicesThemeCSS
    );

    done();
};
