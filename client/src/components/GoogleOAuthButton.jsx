import { useEffect, useRef } from 'react';

const GOOGLE_ID_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector(`script[src="${GOOGLE_ID_SCRIPT_SRC}"]`);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_ID_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleOAuthButton({ disabled, onToken, onError }) {
  const buttonRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onError, onToken]);

  useEffect(() => {
    if (!clientId) {
      onErrorRef.current('Google sign-in is not configured. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env.');
      return undefined;
    }

    let isDisposed = false;
    buttonRef.current.innerHTML = '';

    loadGoogleIdentityScript()
      .then(() => {
        if (isDisposed || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onTokenRef.current(response.credential);
            } else {
              onErrorRef.current('Google sign-in did not return a credential.');
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: 360,
        });
      })
      .catch(() => {
        if (!isDisposed) {
          onErrorRef.current('Unable to load Google sign-in. Check your internet connection and try again.');
        }
      });

    return () => {
      isDisposed = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [clientId]);

  return (
    <div className={`google-oauth-wrap ${disabled ? 'disabled' : ''}`}>
      <div ref={buttonRef} className="google-oauth-button" />
    </div>
  );
}
