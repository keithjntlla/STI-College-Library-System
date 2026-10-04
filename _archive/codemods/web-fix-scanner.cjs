const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/CirculationScannerModal.tsx', 'utf8');

// Fix the dependency array and add onScanRef
const regexEffect = /useEffect\(\(\) => \{[\s\S]*?\}, \[onScan\]\)/;
const newEffect = `  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    let mounted = true
    const initScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(t => t.stop())
        if (!mounted) return
        
        const html5QrCode = new Html5Qrcode(containerId)
        scannerRef.current = html5QrCode
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, aspectRatio: 1.0, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (isScanning.current) return
            isScanning.current = true
            html5QrCode.stop().then(() => {
              onScanRef.current(decodedText)
            }).catch(console.error)
          },
          () => {}
        )
        if (mounted) setInitializing(false)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Camera access denied or not available.')
          setInitializing(false)
        }
      }
    }
    
    initScanner()

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])`;

code = code.replace(regexEffect, newEffect);

// Remove the aspect-square classes from the container to prevent stretching/black bars if they conflict
code = code.replace("className=\"aspect-square w-full [&_video]:object-cover\"", "className=\"w-full [&_video]:w-full [&_video]:object-cover\"");

fs.writeFileSync('src/features/circulation/CirculationScannerModal.tsx', code);
