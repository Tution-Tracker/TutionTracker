'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { recordPayment } from '@/lib/feesApi';
import { todayStr, fmtMonth } from '@/lib/dateUtils';
import { useToast } from '@/context/ToastContext';

interface PaymentFee {
  amount: number;
  paid: number;
  month: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  fee?: PaymentFee | null;
  studentName: string;
  className: string;
}

export default function PaymentModal({ open, onClose, fee, studentName, className }: PaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && fee) {
      setAmount(String(fee.amount - fee.paid));
      setDate(todayStr());
      setMethod('Cash');
      setNote('');
    }
  }, [open, fee]);

  if (!fee) return null;
  const balance = fee.amount - fee.paid;

  async function handleSubmit() {
    const amt = parseInt(amount, 10) || 0;
    if (amt <= 0) {
      toast('Enter a payment amount', 'amber');
      return;
    }
    setSaving(true);
    try {
      await recordPayment(fee, amt, date, method, note);
      toast('Payment recorded!');
      onClose();
    } catch (e) {
      toast('Could not record payment', 'red');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <div className="bg-accent/10 border border-accent/20 rounded-lg px-3.5 py-2.5 text-[13px] text-accent2 mb-3.5">
        <b className="text-slate-100">{studentName}</b> · {className} · {fmtMonth(fee.month)}
        <br />
        Balance: <b className="text-slate-100">LKR {balance.toLocaleString()}</b>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="form-group">
          <label>Amount paid (LKR)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Payment date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>Cash</option>
          <option>Bank transfer</option>
          <option>Online</option>
        </select>
      </div>
      <div className="form-group">
        <label>Note</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Receipt ref…" />
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Recording…' : 'Record'}
        </button>
      </div>
    </Modal>
  );
}