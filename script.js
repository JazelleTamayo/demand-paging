// DOM Elements
const frontPage = document.getElementById('frontPage');
const mainPage = document.getElementById('mainPage');
const getStartedBtn = document.getElementById('getStartedBtn');
const refStringInput = document.getElementById('refString');
const numFramesInput = document.getElementById('numFrames');
const algorithmSelect = document.getElementById('algorithm');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const continueBtn = document.getElementById('continueBtn');
const resetBtn = document.getElementById('resetBtn');
const editBtn = document.getElementById('editBtn');
const fifoDemoBtn = document.getElementById('fifoDemoBtn');
const statusBar = document.getElementById('statusBar');
const pageFaultsCounter = document.getElementById('pageFaults');
const pageHitsCounter = document.getElementById('pageHits');
const currentRefCounter = document.getElementById('currentRef');
const framesContainer = document.getElementById('framesContainer');

// Simulation Variables
let referenceString = [];
let frames = [];
let numFrames = 3;
let algorithm = 'FIFO';
let pageFaults = 0;
let pageHits = 0;
let currentStep = -1;
let simulationInterval;
let simulationRunning = false;
let fifoQueue = [];
let lruStack = [];
let lfuCounts = {};

// Event Listeners
getStartedBtn.addEventListener('click', () => {
    frontPage.style.display = 'none';
    mainPage.style.display = 'block';
});

runBtn.addEventListener('click', startSimulation);
stopBtn.addEventListener('click', pauseSimulation);
continueBtn.addEventListener('click', continueSimulation);
resetBtn.addEventListener('click', resetSimulation);
editBtn.addEventListener('click', editSimulation);
fifoDemoBtn.addEventListener('click', displayFIFOAnimation);

// Animation Helper Functions
function animatePageMovement(page, sourceElement, targetElement, isFault) {
    // Check if elements exist
    if (!sourceElement || !targetElement) {
        console.error("Animation error: Source or target element is missing");
        return;
    }
    
    const floatingPage = document.createElement('div');
    floatingPage.className = 'floating-page';
    floatingPage.textContent = page;
    
    if (isFault) {
        floatingPage.style.backgroundColor = '#ffebee';
        floatingPage.style.color = '#f44336';
        floatingPage.style.border = '2px solid #f44336';
    } else {
        floatingPage.style.backgroundColor = '#e8f5e9';
        floatingPage.style.color = '#4CAF50';
        floatingPage.style.border = '2px solid #4CAF50';
    }
    
    document.body.appendChild(floatingPage);
    
    // Get source and target positions
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    
    // Set initial position (fixed positioning to avoid scroll issues)
    floatingPage.style.position = 'fixed';
    floatingPage.style.top = `${sourceRect.top}px`;
    floatingPage.style.left = `${sourceRect.left}px`;
    floatingPage.style.width = `${sourceRect.width}px`;
    floatingPage.style.height = `${sourceRect.height}px`;
    floatingPage.style.zIndex = '9999';
    
    // Force reflow to ensure initial position is applied
    void floatingPage.offsetWidth;
    
    // Animate to target
    setTimeout(() => {
        floatingPage.style.transition = 'all 0.5s ease';
        floatingPage.style.top = `${targetRect.top}px`;
        floatingPage.style.left = `${targetRect.left}px`;
        floatingPage.style.width = `${targetRect.width}px`;
        floatingPage.style.height = `${targetRect.height}px`;
        
        // Remove after animation
        setTimeout(() => {
            if (floatingPage.parentNode) {
                floatingPage.remove();
            }
        }, 500);
    }, 50);
}

function highlightCurrentStep(stepIndex) {
    const refNumbers = document.querySelectorAll('.ref-number');
    refNumbers.forEach((el, idx) => {
        if (idx === stepIndex) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Main Functions
function startSimulation() {
    // Validate inputs
    const inputString = refStringInput.value.trim();
    if (!inputString) {
        updateStatus('Error: Please enter a reference string', 'error');
        return;
    }
    
    referenceString = inputString.split(/\s+/).map(Number);
    if (referenceString.some(isNaN)) {
        updateStatus('Error: Reference string must contain only numbers', 'error');
        return;
    }
    
    numFrames = parseInt(numFramesInput.value);
    if (isNaN(numFrames) || numFrames < 1) {
        updateStatus('Error: Number of frames must be at least 1', 'error');
        return;
    }
    
    algorithm = algorithmSelect.value;
    
    // Initialize simulation
    resetSimulation(false);
    simulationRunning = true;
    
    // Update UI
    runBtn.disabled = true;
    stopBtn.disabled = false;
    continueBtn.disabled = true;
    editBtn.disabled = true;
    fifoDemoBtn.disabled = true;
    
    updateStatus('Simulation Running', 'running');
    
    // Display reference string
    displayReferenceString();
    
    // Start simulation
    runSimulationStep();
}

function runSimulationStep() {
    if (!simulationRunning) return;
    
    currentStep++;
    currentRefCounter.textContent = currentStep >= referenceString.length ? '-' : referenceString[currentStep];
    
    if (currentStep >= referenceString.length) {
        simulationComplete();
        return;
    }
    
    const currentPage = referenceString[currentStep];
    const framesCopy = [...frames];
    let replacedFrameIndex = -1;
    let stepResult = '';
    let stepExplanation = '';
    
    // Highlight current reference
    highlightCurrentStep(currentStep);
    
    // Check for page hit
    const pageIndex = frames.indexOf(currentPage);
    if (pageIndex !== -1) {
        // Page hit
        pageHits++;
        pageHitsCounter.textContent = pageHits;
        stepResult = 'hit';
        stepExplanation = `Page ${currentPage} already in Frame ${pageIndex + 1}`;
        
        // Update LRU stack (move current page to most recent position)
        if (algorithm === 'LRU') {
            lruStack = lruStack.filter(page => page !== currentPage);
            lruStack.push(currentPage);
        }
        
        // Create frame row with hit animation
        const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation);
        
        setTimeout(() => {
            const hitFrame = rowElement.querySelector('.hit');
            const activeRef = document.querySelector('.ref-number.active');
            if (hitFrame && activeRef) {
                animatePageMovement(currentPage, activeRef, hitFrame, false);
            }
        }, 300);
    } else {
        // Page fault
        pageFaults++;
        pageFaultsCounter.textContent = pageFaults;
        stepResult = 'fault';
        
        if (frames.includes(null)) {
            // Empty frame available
            const emptyIndex = frames.indexOf(null);
            frames[emptyIndex] = currentPage;
            stepExplanation = `Page ${currentPage} loaded into empty Frame ${emptyIndex + 1}`;
            
            // Create frame row and animate
            const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation);
            
            setTimeout(() => {
                const targetFrame = rowElement.querySelectorAll('.frame')[emptyIndex];
                const activeRef = document.querySelector('.ref-number.active');
                if (targetFrame && activeRef) {
                    animatePageMovement(currentPage, activeRef, targetFrame, true);
                }
            }, 300);
            
            // Update tracking structures
            if (algorithm === 'FIFO') {
                fifoQueue.push({ page: currentPage, frameIndex: emptyIndex });
            }
            if (algorithm === 'LRU') {
                lruStack.push(currentPage);
            }
        } else {
            // Need to replace a page
            if (algorithm === 'FIFO') {
                // FIFO replacement
                const oldest = fifoQueue.shift();
                replacedFrameIndex = oldest.frameIndex;
                const replacedPage = frames[replacedFrameIndex];
                frames[replacedFrameIndex] = currentPage;
                fifoQueue.push({ page: currentPage, frameIndex: replacedFrameIndex });
                stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1} (FIFO)`;
                
                // Create frame row and animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation);
                
                setTimeout(() => {
                    const targetFrame = rowElement.querySelectorAll('.frame')[replacedFrameIndex];
                    const activeRef = document.querySelector('.ref-number.active');
                    if (targetFrame && activeRef) {
                        animatePageMovement(currentPage, activeRef, targetFrame, true);
                    }
                }, 300);
            } else if (algorithm === 'LRU') {
                // LRU replacement
                const leastRecentPage = lruStack.shift();
                replacedFrameIndex = frames.indexOf(leastRecentPage);
                const replacedPage = frames[replacedFrameIndex];
                frames[replacedFrameIndex] = currentPage;
                lruStack.push(currentPage);
                stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1} (LRU)`;
                
                // Create frame row and animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation);
                
                setTimeout(() => {
                    const targetFrame = rowElement.querySelectorAll('.frame')[replacedFrameIndex];
                    const activeRef = document.querySelector('.ref-number.active');
                    if (targetFrame && activeRef) {
                        animatePageMovement(currentPage, activeRef, targetFrame, true);
                    }
                }, 300);
            } else if (algorithm === 'Optimal') {
                // Optimal replacement
                let farthestNextUse = -1;
                let pageToReplace = null;
                
                // Check each frame for future usage
                for (let i = 0; i < frames.length; i++) {
                    const page = frames[i];
                    // Find next occurrence of this page in future references
                    let nextUse = referenceString.slice(currentStep + 1).indexOf(page);
                    
                    // If page won't be used again, it's the best candidate
                    if (nextUse === -1) {
                        pageToReplace = page;
                        replacedFrameIndex = i;
                        break;
                    }
                    
                    // Track the page with farthest future use
                    if (nextUse > farthestNextUse) {
                        farthestNextUse = nextUse;
                        pageToReplace = page;
                        replacedFrameIndex = i;
                    }
                }
                
                // Replace the selected page
                const replacedPage = frames[replacedFrameIndex];
                frames[replacedFrameIndex] = currentPage;
                stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1} (Optimal)`;
                
                // Create frame row and animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation);
                
                setTimeout(() => {
                    const targetFrame = rowElement.querySelectorAll('.frame')[replacedFrameIndex];
                    const activeRef = document.querySelector('.ref-number.active');
                    if (targetFrame && activeRef) {
                        animatePageMovement(currentPage, activeRef, targetFrame, true);
                    }
                }, 300);
            }
        }
    }
    
    // Continue to next step
    simulationInterval = setTimeout(runSimulationStep, 1500);
}

function pauseSimulation() {
    simulationRunning = false;
    clearTimeout(simulationInterval);
    stopBtn.disabled = true;
    continueBtn.disabled = false;
    updateStatus('Simulation Paused', 'paused');
}

function continueSimulation() {
    simulationRunning = true;
    continueBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus('Simulation Running', 'running');
    runSimulationStep();
}

function resetSimulation(resetInputs = true) {
    simulationRunning = false;
    clearTimeout(simulationInterval);
    currentStep = -1;
    pageFaults = 0;
    pageHits = 0;
    frames = Array(numFrames).fill(null);
    fifoQueue = [];
    lruStack = [];
    lfuCounts = {};
    
    if (resetInputs) {
        refStringInput.value = '';
        numFramesInput.value = '3';
        algorithmSelect.value = 'FIFO';
    }
    
    pageFaultsCounter.textContent = '0';
    pageHitsCounter.textContent = '0';
    currentRefCounter.textContent = '-';
    framesContainer.innerHTML = '';
    updateStatus('Ready');
    
    // Remove floating pages
    document.querySelectorAll('.floating-page').forEach(el => el.remove());
    
    // Update button states
    runBtn.disabled = false;
    stopBtn.disabled = true;
    continueBtn.disabled = true;
    editBtn.disabled = false;
    fifoDemoBtn.disabled = false;
}

function editSimulation() {
    resetSimulation(false);
    updateStatus('Edit Mode - Adjust parameters and run again');
}

function updateStatus(message, type = '') {
    statusBar.textContent = message;
    statusBar.className = 'status-bar';
    
    if (type) {
        statusBar.classList.add(type);
    }
}

function displayReferenceString() {
    const refStringDisplay = document.createElement('div');
    refStringDisplay.className = 'ref-string-display';
    
    referenceString.forEach((num, idx) => {
        const numElement = document.createElement('div');
        numElement.className = 'ref-number';
        numElement.textContent = num;
        refStringDisplay.appendChild(numElement);
    });
    
    framesContainer.innerHTML = '';
    framesContainer.appendChild(refStringDisplay);
}

function createFrameRow(currentPage, oldFrames, newFrames, replacedIndex, result, explanation) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'frame-row';
    
    // Create step info
    const stepInfo = document.createElement('div');
    stepInfo.className = 'step-info';
    stepInfo.innerHTML = `<strong>Step ${currentStep + 1}:</strong> ${explanation}`;
    rowDiv.appendChild(stepInfo);
    
    // Create frames container
    const framesDiv = document.createElement('div');
    framesDiv.className = 'frames-row';
    
    for (let i = 0; i < numFrames; i++) {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'frame';
        
        if (newFrames[i] === null) {
            frameDiv.classList.add('empty');
            frameDiv.textContent = '-';
        } else {
            frameDiv.textContent = newFrames[i];
        }
        
        if (i === replacedIndex) {
            frameDiv.classList.add('replaced');
        }
        
        if (result === 'hit' && newFrames[i] === currentPage) {
            frameDiv.classList.add('hit');
        } else if (result === 'fault' && newFrames[i] === currentPage) {
            frameDiv.classList.add('fault');
        }
        
        framesDiv.appendChild(frameDiv);
    }
    
    rowDiv.appendChild(framesDiv);
    
    // Create result indicator
    const resultDiv = document.createElement('div');
    resultDiv.className = `result ${result}`;
    resultDiv.textContent = result === 'hit' ? 'HIT' : 'FAULT';
    rowDiv.appendChild(resultDiv);
    
    framesContainer.appendChild(rowDiv);
    
    // Set initial opacity and animate fade in
    rowDiv.style.opacity = '0';
    rowDiv.style.animation = 'fadeIn 0.5s forwards';
    
    // Scroll to show new row
    setTimeout(() => {
        rowDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    return rowDiv;
}

function simulationComplete() {
    simulationRunning = false;
    clearTimeout(simulationInterval);
    
    // Calculate hit ratio
    const totalReferences = pageFaults + pageHits;
    const hitRatio = totalReferences > 0 ? (pageHits / totalReferences * 100) : 0;
    
    // Update UI
    runBtn.disabled = false;
    stopBtn.disabled = true;
    continueBtn.disabled = true;
    editBtn.disabled = false;
    fifoDemoBtn.disabled = false;
    
    updateStatus('Simulation Complete', 'complete');
    
    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary';
    summaryDiv.innerHTML = `
        <h3>Simulation Summary</h3>
        <p>Algorithm: ${algorithm}</p>
        <p>Total References: ${totalReferences}</p>
        <p>Page Hits: ${pageHits}</p>
        <p>Page Faults: ${pageFaults}</p>
        <p>Hit Ratio: ${hitRatio.toFixed(2)}%</p>
    `;
    framesContainer.appendChild(summaryDiv);
    summaryDiv.scrollIntoView({ behavior: 'smooth' });
}

function displayFIFOAnimation() {
    const demoReferenceString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2];
    const demoNumFrames = 3;
    let demoFrames = Array(demoNumFrames).fill(null);
    let demoFifoQueue = [];
    let demoHits = 0;
    let demoFaults = 0;
    
    // Reset simulation for demo
    resetSimulation(false);
    document.getElementById('pageFaults').textContent = '0';
    document.getElementById('pageHits').textContent = '0';
    document.getElementById('currentRef').textContent = '-';
    framesContainer.innerHTML = '';
    
    // Create container for the animation
    const animationContainer = document.createElement('div');
    animationContainer.className = 'fifo-animation';
    framesContainer.appendChild(animationContainer);
    
    // Display title
    const title = document.createElement('h3');
    title.textContent = 'First In First Out (FIFO) Demo';
    animationContainer.appendChild(title);
    
    // Display reference string
    const refStringDisplay = document.createElement('div');
    refStringDisplay.className = 'ref-string-display';
    
    demoReferenceString.forEach((num, idx) => {
        const numElement = document.createElement('div');
        numElement.className = 'ref-number';
        numElement.textContent = num;
        refStringDisplay.appendChild(numElement);
    });
    
    animationContainer.appendChild(refStringDisplay);
    
    // Create frame display
    const frameDisplayContainer = document.createElement('div');
    frameDisplayContainer.className = 'frame-display-container';
    animationContainer.appendChild(frameDisplayContainer);
    
    // Create initial frame rows
    for (let i = 0; i < demoNumFrames; i++) {
        const frameRow = document.createElement('div');
        frameRow.className = 'demo-frame-row';
        
        const frameLabel = document.createElement('div');
        frameLabel.className = 'demo-frame-label';
        frameLabel.textContent = `Frame ${i + 1}:`;
        frameRow.appendChild(frameLabel);
        
        const frameContent = document.createElement('div');
        frameContent.className = 'frame empty';
        frameContent.textContent = '-';
        frameContent.id = `demo-frame-${i}`;
        frameRow.appendChild(frameContent);
        
        frameDisplayContainer.appendChild(frameRow);
    }
    
    // Disable buttons during demo
    runBtn.disabled = true;
    resetBtn.disabled = true;
    editBtn.disabled = true;
    fifoDemoBtn.disabled = true;
    
    updateStatus('FIFO Demo Running', 'running');
    
    // Simulate each step with animation
    demoReferenceString.forEach((page, index) => {
        setTimeout(() => {
            // Highlight current reference
            document.querySelectorAll('.ref-number').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
            
            document.getElementById('currentRef').textContent = page;
            
            let isHit = false;
            let replacedIndex = -1;
            let replacedPage = null;
            
            // Check for hit
            if (demoFrames.includes(page)) {
                demoHits++;
                isHit = true;
                document.getElementById('pageHits').textContent = demoHits;
            } else {
                demoFaults++;
                document.getElementById('pageFaults').textContent = demoFaults;
                
                // FIFO replacement
                if (demoFrames.includes(null)) {
                    // Fill empty frame
                    const emptyIndex = demoFrames.indexOf(null);
                    demoFrames[emptyIndex] = page;
                    demoFifoQueue.push(emptyIndex);
                    replacedIndex = emptyIndex;
                } else {
                    // Replace oldest
                    const oldestIndex = demoFifoQueue.shift();
                    replacedPage = demoFrames[oldestIndex];
                    demoFrames[oldestIndex] = page;
                    demoFifoQueue.push(oldestIndex);
                    replacedIndex = oldestIndex;
                }
            }
            
            // Update frame displays with animation
            for (let i = 0; i < demoNumFrames; i++) {
                const frameElement = document.getElementById(`demo-frame-${i}`);
                
                // Clear previous classes
                frameElement.className = 'frame';
                
                if (demoFrames[i] === null) {
                    frameElement.classList.add('empty');
                    frameElement.textContent = '-';
                } else {
                    frameElement.textContent = demoFrames[i];
                    
                    if (isHit && demoFrames[i] === page) {
                        frameElement.classList.add('hit');
                        
                        // Animate hit
                        const activeRef = document.querySelector('.ref-number.active');
                        if (activeRef) {
                            animatePageMovement(page, activeRef, frameElement, false);
                        }
                    } else if (!isHit && i === replacedIndex) {
                        frameElement.classList.add('fault');
                        
                        // Animate fault/replacement
                        const activeRef = document.querySelector('.ref-number.active');
                        if (activeRef) {
                            animatePageMovement(page, activeRef, frameElement, true);
                        }
                    }
                }
            }
            
            // If demo is complete, re-enable buttons
            if (index === demoReferenceString.length - 1) {
                setTimeout(() => {
                    runBtn.disabled = false;
                    resetBtn.disabled = false;
                    editBtn.disabled = false;
                    fifoDemoBtn.disabled = false;
                    updateStatus('FIFO Demo Complete', 'complete');
                    
                    // Add demo summary
                    const hitRatio = ((demoHits / (demoHits + demoFaults)) * 100).toFixed(2);
                    const summaryDiv = document.createElement('div');
                    summaryDiv.className = 'summary';
                    summaryDiv.innerHTML = `
                        <h3>FIFO Demo Summary</h3>
                        <p>Total References: ${demoReferenceString.length}</p>
                        <p>Page Hits: ${demoHits}</p>
                        <p>Page Faults: ${demoFaults}</p>
                        <p>Hit Ratio: ${hitRatio}%</p>
                    `;
                    animationContainer.appendChild(summaryDiv);
                }, 1000);
            }
        }, index * 1500); // 1.5 second delay between steps
    });
}
