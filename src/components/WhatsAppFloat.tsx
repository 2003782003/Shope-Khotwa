import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useStore } from '../lib/store';
import { storeSettings } from '../lib/data';

export default function WhatsAppFloat() {
  const { lang } = useStore();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const isRtl = lang === 'ar';
  const waNumber = storeSettings.whatsapp.replace(/[^0-9]/g, '');

  const quickMessages = [
    { ar: 'أريد الاستفسار عن منتج', fr: 'Je voudrais des informations sur un produit', en: 'I want to inquire about a product' },
    { ar: 'أريد تتبع طلبي', fr: 'Je voudrais suivre ma commande', en: 'I want to track my order' },
    { ar: 'أريد إرجاع أو استبدال منتج', fr: 'Je voudrais retourner ou échanger un produit', en: 'I want to return or exchange a product' },
  ];

  const sendMessage = (msg: string) => {
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1fb855] text-white rounded-full shadow-xl shadow-[#25D366]/30 flex items-center justify-center transition-colors"
        style={{ [isRtl ? 'left' : 'right']: '24px' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="wa" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Pulse ring */}
      {!open && (
        <div
          className="fixed bottom-6 z-40 w-14 h-14 rounded-full animate-ping bg-[#25D366]/30 pointer-events-none"
          style={{ [isRtl ? 'left' : 'right']: '24px', animationDuration: '2s' }}
        />
      )}

      {/* Chat popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 z-50 w-80 max-w-[calc(100vw-32px)] bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden"
            style={{ [isRtl ? 'left' : 'right']: '24px' }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="bg-[#075E54] text-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">خ</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">KHOTWA</h4>
                  <p className="text-[10px] text-white/70 flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#25D366] rounded-full" />
                    {lang === 'ar' ? 'متصل الآن • يرد عادة خلال دقائق' : 'Online • Usually replies in minutes'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat body */}
            <div className="bg-[#ECE5DD] p-4 min-h-[120px]">
              {/* Store message bubble */}
              <div className={`bg-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm ${isRtl ? 'mr-auto' : 'ml-0'}`}>
                <p className="text-sm text-gray-800">
                  {lang === 'ar' ? 'مرحباً! 👋 كيف يمكننا مساعدتك؟' : lang === 'fr' ? 'Bonjour! 👋 Comment pouvons-nous vous aider?' : 'Hello! 👋 How can we help you?'}
                </p>
                <p className="text-[9px] text-gray-400 mt-1 text-end">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Quick messages */}
            <div className="p-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] text-text-muted font-semibold">
                {lang === 'ar' ? 'رسائل سريعة:' : 'Quick messages:'}
              </p>
              {quickMessages.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(msg[lang])}
                  className="w-full text-start bg-surface hover:bg-surface-dark border border-border/50 rounded-xl px-3 py-2 text-xs text-text-light hover:text-text transition-colors"
                >
                  {msg[lang]}
                </button>
              ))}
            </div>

            {/* Custom message */}
            <div className="p-3 border-t border-border/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type a message...'}
                  onKeyDown={e => { if (e.key === 'Enter' && message.trim()) sendMessage(message); }}
                  className="flex-1 bg-surface border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => message.trim() && sendMessage(message)}
                  disabled={!message.trim()}
                  className="w-10 h-10 bg-[#25D366] hover:bg-[#1fb855] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
