import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, ChevronLeft, Home, Calendar, Users, FileText, CreditCard,
    Check, Building, Palmtree, Edit3, Send, Shield, MapPin, RefreshCw, Eye, X
} from 'lucide-react';
import * as contractsApi from './api/contracts.js';
import { Layout } from './components/Layout.jsx';

export default function ContractApp() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [signatureStatus, setSignatureStatus] = useState({ landlord: false, tenant: false });
    const [contractLanguage, setContractLanguage] = useState('es');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        contractType: '',
        role: '',
        propertyAddress: '',
        propertyCity: '',
        propertyPostalCode: '',
        catastralRef: '',
        touristLicense: '',
        landlordName: '',
        landlordIdType: 'nie',
        landlordId: '',
        landlordEmail: '',
        landlordPhone: '',
        tenantName: '',
        tenantIdType: 'passport',
        tenantId: '',
        tenantEmail: '',
        tenantPhone: '',
        rentAmount: '',
        depositAmount: '',
        prepaymentAmount: '',
        prepaymentNonRefundable: true,
        cancellationDeadline: '',
        currency: 'EUR',
        startDate: '',
        endDate: '',
        paymentDay: '1',
        utilitiesIncluded: [],
        furnished: '',
        pets: '',
        subletting: '',
        noticePeriod: '30',
        maxGuests: '',
        checkIn: '15:00',
        checkOut: '11:00',
        houseRules: [],
        terms: ''
    });

    // Mock data for saved properties
    const savedProperties = [
        { id: 1, address: 'Calle Larios 15, 3B', city: 'Málaga', postalCode: '29015', catastral: '9872301UF7697S0001WX', vft: 'VFT/MA/00123' },
        { id: 2, address: 'Avenida del Mar 42', city: 'Marbella', postalCode: '29602', catastral: '1234567UF1234N0001AB', vft: 'VFT/MA/00456' }
    ];

    const contractTypes = [
        { id: 'longterm', label: 'Långtidsboende', sublabel: '6+ månader (LAU)', icon: Building },
        { id: 'seasonal', label: 'Säsongsboende', sublabel: '1-6 månader', icon: Palmtree },
        { id: 'tourist', label: 'Turistuthyrning', sublabel: '< 1 månad (VFT)', icon: Calendar }
    ];

    const idTypes = [
        { value: 'nie', label: 'NIE' },
        { value: 'dni', label: 'DNI' },
        { value: 'passport', label: 'PASS' }
    ];

    const utilities = [
        { id: 'electricity', label: 'El', labelEs: 'Electricidad' },
        { id: 'water', label: 'Vatten', labelEs: 'Agua' },
        { id: 'gas', label: 'Gas', labelEs: 'Gas' },
        { id: 'internet', label: 'Internet', labelEs: 'Internet' },
        { id: 'comunidad', label: 'Comunidad', labelEs: 'Comunidad' },
        { id: 'ibi', label: 'IBI', labelEs: 'IBI' }
    ];

    const houseRuleOptions = [
        { id: 'no_smoking', label: 'Rökning förbjuden', labelEs: 'Prohibido fumar' },
        { id: 'no_parties', label: 'Fester förbjudna', labelEs: 'Prohibidas las fiestas' },
        { id: 'quiet_hours', label: 'Tystnad 22-08', labelEs: 'Silencio 22:00-08:00' },
        { id: 'no_shoes', label: 'Skor av inomhus', labelEs: 'Sin zapatos en interior' }
    ];

    const updateForm = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const toggleArrayItem = (field, item) => setFormData(prev => ({
        ...prev,
        [field]: prev[field].includes(item) ? prev[field].filter(i => i !== item) : [...prev[field], item]
    }));

    const loadProperty = (property) => {
        updateForm('propertyAddress', property.address);
        updateForm('propertyCity', property.city);
        updateForm('propertyPostalCode', property.postalCode);
        updateForm('catastralRef', property.catastral);
        if (property.vft) updateForm('touristLicense', property.vft);
    };

    const simulateBankIdSign = (party) => {
        if (confirm(`Öppna BankID för att signera som ${party === 'landlord' ? 'hyresvärd' : 'hyresgäst'}?`)) {
            setTimeout(() => setSignatureStatus(prev => ({ ...prev, [party]: true })), 1000);
        }
    };

    const steps = [
        { title: 'Kontraktstyp', icon: FileText },
        { title: 'Fastighet', icon: Home },
        { title: 'Parter', icon: Users },
        { title: 'Betalning', icon: CreditCard },
        { title: 'Villkor', icon: Check }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getIncludedUtilities = () => utilities.filter(u => formData.utilitiesIncluded.includes(u.id)).map(u => u.labelEs).join(', ');
    const getHouseRules = () => houseRuleOptions.filter(r => formData.houseRules.includes(r.id)).map(r => r.labelEs).join(', ');

    const translations = {
        es: { title: { tourist: 'CONTRATO DE ARRENDAMIENTO TURÍSTICO', seasonal: 'CONTRATO DE TEMPORADA', longterm: 'CONTRATO DE ARRENDAMIENTO' }, parties: 'REUNIDOS', landlord: 'ARRENDADOR', tenant: 'ARRENDATARIO', clauses: 'CLÁUSULAS', signatures: 'FIRMAS DIGITALES', signWith: 'Firmar con BankID', signed: 'Firmado', edit: 'Redigera', send: 'Skicka' },
        sv: { title: { tourist: 'TURISTHYRESAVTAL', seasonal: 'SÄSONGSAVTAL', longterm: 'HYRESAVTAL' }, parties: 'PARTERNA', landlord: 'HYRESVÄRD', tenant: 'HYRESGÄST', clauses: 'VILLKOR', signatures: 'SIGNATURER', signWith: 'Signera med BankID', signed: 'Signerad', edit: 'Redigera', send: 'Skicka' },
        en: { title: { tourist: 'TOURIST RENTAL AGREEMENT', seasonal: 'SEASONAL AGREEMENT', longterm: 'LEASE AGREEMENT' }, parties: 'THE PARTIES', landlord: 'LANDLORD', tenant: 'TENANT', clauses: 'CLAUSES', signatures: 'SIGNATURES', signWith: 'Sign with BankID', signed: 'Signed', edit: 'Edit', send: 'Send' }
    };

    const t = translations[contractLanguage];

    const handleCreateContract = async () => {
        setLoading(true);
        setError(null);
        try {
            const fullAddress = `${formData.propertyAddress}, ${formData.propertyCity} ${formData.propertyPostalCode}`;

            const extraTerms = {
                contractLanguage,
                contractType: formData.contractType,
                catastralRef: formData.catastralRef,
                touristLicense: formData.touristLicense,
                utilities: formData.utilitiesIncluded,
                houseRules: formData.houseRules,
                pets: formData.pets,
                subletting: formData.subletting,
                maxGuests: formData.maxGuests,
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                prepayment: formData.prepaymentAmount ? {
                    amount: formData.prepaymentAmount,
                    refundable: !formData.prepaymentNonRefundable,
                    deadline: formData.cancellationDeadline
                } : null,
                parties: {
                    landlord: {
                        name: formData.landlordName,
                        idType: formData.landlordIdType,
                        id: formData.landlordId,
                        email: formData.landlordEmail,
                        phone: formData.landlordPhone
                    },
                    tenant: {
                        name: formData.tenantName,
                        idType: formData.tenantIdType,
                        id: formData.tenantId,
                        email: formData.tenantEmail,
                        phone: formData.tenantPhone
                    }
                },
                customTerms: formData.terms
            };

            const payload = {
                property_address: fullAddress,
                creator_side: formData.role === 'landlord' ? 'LANDLORD' : 'TENANT',
                rent_amount: parseFloat(formData.rentAmount),
                deposit_amount: parseFloat(formData.depositAmount),
                currency: formData.currency,
                start_date: formData.startDate,
                end_date: formData.endDate || undefined,
                terms_text: JSON.stringify(extraTerms, null, 2)
            };

            const contract = await contractsApi.createContract(payload);

            // If simulated signatures exist, try to sign the contract
            // In a real app, this would trigger a real signing flow
            if (signatureStatus[formData.role]) {
                await contractsApi.signContract(contract.id);
            }

            navigate(`/contracts/${contract.id}`, { replace: true });
        } catch (err) {
            setError(err?.message || 'Failed to create contract');
        } finally {
            setLoading(false);
        }
    };

    const ContractPreview = () => (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full my-4 relative shadow-2xl">
                <div className="sticky top-0 bg-white border-b p-3 rounded-t-2xl flex items-center justify-between z-10">
                    <h2 className="font-bold">Förhandsgranskning</h2>
                    <div className="flex gap-2 items-center">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {[{ code: 'es', label: '🇪🇸' }, { code: 'sv', label: '🇸🇪' }, { code: 'en', label: '🇬🇧' }].map(lang => (
                                <button key={lang.code} onClick={() => setContractLanguage(lang.code)} className={`px-2 py-1 rounded text-sm ${contractLanguage === lang.code ? 'bg-white shadow-sm' : ''}`}>{lang.label}</button>
                            ))}
                        </div>
                        <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-4 space-y-4 text-sm">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="text-center border-b pb-4">
                        <h1 className="text-lg font-bold">{t.title[formData.contractType]}</h1>
                        <p className="text-gray-500 text-xs">{formData.contractType === 'tourist' ? 'Decreto 28/2016' : 'LAU 29/1994'}</p>
                    </div>

                    <p>En <strong>{formData.propertyCity || '[Ciudad]'}</strong>, a {formatDate(formData.startDate) || '[Fecha]'}</p>

                    <div>
                        <h3 className="font-bold mb-2">{t.parties}</h3>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-xs">
                            <p><strong>{t.landlord}:</strong> {formData.landlordName || '[Nombre]'} - {formData.landlordIdType.toUpperCase()}: {formData.landlordId || '[ID]'}</p>
                            <p><strong>{t.tenant}:</strong> {formData.tenantName || '[Nombre]'} - {formData.tenantIdType.toUpperCase()}: {formData.tenantId || '[ID]'}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg text-xs">
                        <p><strong>Dirección:</strong> {formData.propertyAddress}, {formData.propertyCity} {formData.propertyPostalCode}</p>
                        <p><strong>Ref. Catastral:</strong> {formData.catastralRef}</p>
                        {formData.touristLicense && <p><strong>VFT:</strong> {formData.touristLicense}</p>}
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">{t.clauses}</h3>
                        <div className="space-y-2 text-xs">
                            <p><strong>Duración:</strong> {formatDate(formData.startDate)} - {formatDate(formData.endDate) || 'Indefinido'}</p>
                            <p><strong>Renta:</strong> {formData.rentAmount} EUR {formData.contractType === 'tourist' ? '(total)' : '/mes'}</p>
                            <p><strong>Fianza:</strong> {formData.depositAmount} EUR</p>

                            {formData.prepaymentAmount && (
                                <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <p><strong>Pago anticipado:</strong> {formData.prepaymentAmount} EUR - {formData.prepaymentNonRefundable ? '❌ NO reembolsable' : '✓ Reembolsable'}</p>
                                    {formData.cancellationDeadline && <p><strong>Cancelación hasta:</strong> {formatDate(formData.cancellationDeadline)}</p>}
                                </div>
                            )}

                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <p>💰 Pago seguro via escrow - fondos liberados tras check-in</p>
                            </div>

                            {formData.utilitiesIncluded.length > 0 && <p><strong>Incluido:</strong> {getIncludedUtilities()}</p>}
                            {formData.houseRules.length > 0 && <p><strong>Normas:</strong> {getHouseRules()}</p>}
                            {formData.pets === 'no' && <p>🚫 No mascotas</p>}
                            {formData.terms && <p><strong>Términos adicionales:</strong> {formData.terms}</p>}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold mb-3">{t.signatures}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {['landlord', 'tenant'].map(party => (
                                <div key={party} className="border rounded-lg p-3 text-center">
                                    <p className="font-medium text-sm mb-1">{t[party]}</p>
                                    <p className="text-xs text-gray-500 mb-2">{formData[`${party}Name`] || '[Nombre]'}</p>
                                    {signatureStatus[party] ? (
                                        <div className="bg-green-50 text-green-700 p-2 rounded text-xs flex items-center justify-center gap-1">
                                            <Shield size={14} /> {t.signed}
                                        </div>
                                    ) : (
                                        <button onClick={() => simulateBankIdSign(party)} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs flex items-center justify-center gap-1 transition-colors">
                                            <Shield size={14} /> {t.signWith}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center text-xs text-gray-400 pt-2 border-t">
                        <p>ID: PENDING-CREATION</p>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t p-3 rounded-b-2xl flex gap-3">
                    <button onClick={() => { setShowPreview(false); setEditMode(true); }} className="flex-1 btn btn-secondary" disabled={loading}>
                        <Edit3 size={16} /> {t.edit}
                    </button>
                    <button onClick={handleCreateContract} className="flex-1 btn btn-primary" disabled={loading}>
                        {loading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} {t.send}
                    </button>
                </div>
            </div>
        </div>
    );

    const canProceed = () => {
        switch (step) {
            case 0:
                return formData.contractType && formData.role;
            case 1:
                const basicProp = formData.propertyAddress && formData.propertyCity && formData.propertyPostalCode && formData.catastralRef && formData.catastralRef.length === 20;
                if (formData.contractType === 'tourist') return basicProp && formData.touristLicense;
                return basicProp;
            case 2:
                // Require all contact details for a valid legal contract
                return formData.landlordName && formData.landlordId && formData.landlordEmail && formData.landlordPhone &&
                    formData.tenantName && formData.tenantId && formData.tenantEmail && formData.tenantPhone;
            case 3:
                const basicEcon = formData.rentAmount && formData.depositAmount && formData.startDate && formData.endDate;
                if (formData.contractType === 'tourist') return basicEcon && formData.checkIn && formData.checkOut;
                return basicEcon;
            case 4:
                // Step 4 is mostly options, but if we wanted to enforce strictly:
                // return formData.terms || formData.utilitiesIncluded.length > 0;
                return true; // Options are valid even if empty
            default:
                return true;
        }
    };

    return (
        <Layout title="Nytt kontrakt" hideTitle>
            <div className="min-h-screen bg-gray-50 p-3 -m-4">
                <div className="max-w-md mx-auto">
                    <div className="mb-4">
                        <div className='flex items-center justify-between'>
                            <h1 className="text-xl font-bold text-gray-900">{editMode ? 'Redigera avtal' : 'Nytt kontrakt'}</h1>
                            <button onClick={() => navigate('/')} className="text-gray-500"><X size={20} /></button>
                        </div>

                        <div className="flex items-center gap-1 mt-6 justify-center">
                            {steps.map((s, i) => (
                                <React.Fragment key={i}>
                                    <button onClick={() => editMode && setStep(i)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${i <= step ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'bg-gray-100 text-gray-400'} ${i === step ? 'ring-4 ring-primary-50 scale-110' : ''}`} disabled={!editMode && i > step}>
                                        {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
                                    </button>
                                    {i < 4 && <div className={`flex-1 h-0.5 rounded transition-colors duration-500 mx-2 ${i < step ? 'bg-primary-200' : 'bg-gray-100'}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{steps[step].title}</p>
                    </div>

                    <div className="card">
                        <div className="contract-form">
                            {step === 0 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div>
                                        <h2 className="card-title">Vilken typ av uthyrning?</h2>
                                        <div className='grid gap-3'>
                                            {contractTypes.map(type => {
                                                const Icon = type.icon;
                                                const isSelected = formData.contractType === type.id;
                                                return (
                                                    <button key={type.id} onClick={() => updateForm('contractType', type.id)} className={`selection-card ${isSelected ? 'selected' : ''}`}>
                                                        <div className="selection-card-icon"><Icon size={24} /></div>
                                                        <div className="selection-card-content">
                                                            <div className="selection-card-title">{type.label}</div>
                                                            <div className="selection-card-subtitle">{type.sublabel}</div>
                                                        </div>
                                                        {isSelected && <div className="selection-card-check"><Check size={14} strokeWidth={3} /></div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-8 mt-8">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Jag agerar som</label>
                                        <div className="creator-side-options">
                                            {['landlord', 'tenant'].map(role => (
                                                <button key={role} onClick={() => updateForm('role', role)} className={`radio-option flex-1 justify-center ${formData.role === role ? 'active' : ''}`}>
                                                    <input type="radio" checked={formData.role === role} readOnly className="pointer-events-none" />
                                                    {role === 'landlord' ? 'Hyresvärd' : 'Hyresgäst'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h2 className="card-title mb-4">Fastigheten</h2>

                                    {formData.role === 'landlord' && (
                                        <div className="info-box info-primary mb-4 p-3">
                                            <div className="info-box-icon"><MapPin size={18} className="text-primary-600" /></div>
                                            <div className="info-box-content flex-1">
                                                <h4 className="text-primary-800">Hämta från mina fastigheter</h4>
                                                <div className="relative mt-1">
                                                    <select onChange={(e) => { const p = savedProperties.find(x => x.id === +e.target.value); if (p) loadProperty(p); }} className="w-full" defaultValue="">
                                                        <option value="" disabled>Välj fastighet...</option>
                                                        {savedProperties.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <label>
                                        Adress *
                                        <input type="text" placeholder="Gatuadress, nummer" value={formData.propertyAddress} onChange={e => updateForm('propertyAddress', e.target.value)} />
                                    </label>

                                    <div className="form-row">
                                        <label>
                                            Stad *
                                            <input type="text" placeholder="T.ex. Málaga" value={formData.propertyCity} onChange={e => updateForm('propertyCity', e.target.value)} />
                                        </label>
                                        <label>
                                            Postnummer *
                                            <input type="text" placeholder="29000" value={formData.propertyPostalCode} onChange={e => updateForm('propertyPostalCode', e.target.value)} />
                                        </label>
                                    </div>

                                    <label>
                                        Referencia Catastral *
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="20 tecken" value={formData.catastralRef} onChange={e => updateForm('catastralRef', e.target.value)} className="font-mono" />
                                            {formData.role === 'landlord' && <button className="btn btn-secondary px-3" title="Hämta automatiskt"><RefreshCw size={20} /></button>}
                                        </div>
                                    </label>

                                    {formData.contractType === 'tourist' && (
                                        <label>
                                            Turistlicens (VFT) *
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="VFT/MA/..." value={formData.touristLicense} onChange={e => updateForm('touristLicense', e.target.value)} />
                                                {formData.role === 'landlord' && <button className="btn btn-secondary px-3"><RefreshCw size={20} /></button>}
                                            </div>
                                        </label>
                                    )}

                                    <label>
                                        Är bostaden möblerad?
                                        <div className="creator-side-options">
                                            {['furnished', 'unfurnished', 'partial'].map(opt => (
                                                <label key={opt} className="radio-option flex-1 justify-center">
                                                    <input type="radio" name="furnished" checked={formData.furnished === opt} onChange={() => updateForm('furnished', opt)} />
                                                    <span>{opt === 'furnished' ? 'Ja' : opt === 'unfurnished' ? 'Nej' : 'Delvis'}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </label>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h2 className="card-title">Avtalsparter</h2>

                                    <div className="space-y-6">
                                        {['landlord', 'tenant'].map(party => (
                                            <div key={party} className="p-4 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`p-1.5 rounded-lg ${party === 'landlord' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {party === 'landlord' ? <Home size={16} /> : <Users size={16} />}
                                                    </div>
                                                    <h3 className="font-semibold text-sm text-gray-900">{party === 'landlord' ? 'Hyresvärd' : 'Hyresgäst'}</h3>
                                                </div>

                                                <div className="contract-form">
                                                    <label>
                                                        Fullständigt namn *
                                                        <input type="text" value={formData[`${party}Name`]} onChange={e => updateForm(`${party}Name`, e.target.value)} />
                                                    </label>

                                                    <div className="form-row">
                                                        <label>
                                                            ID-typ
                                                            <select value={formData[`${party}IdType`]} onChange={e => updateForm(`${party}IdType`, e.target.value)}>
                                                                {idTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                            </select>
                                                        </label>
                                                        <label>
                                                            ID-nummer *
                                                            <input type="text" value={formData[`${party}Id`]} onChange={e => updateForm(`${party}Id`, e.target.value)} />
                                                        </label>
                                                    </div>

                                                    <div className="form-row">
                                                        <label>
                                                            E-post
                                                            <input type="email" value={formData[`${party}Email`]} onChange={e => updateForm(`${party}Email`, e.target.value)} />
                                                        </label>
                                                        <label>
                                                            Telefon
                                                            <input type="tel" value={formData[`${party}Phone`]} onChange={e => updateForm(`${party}Phone`, e.target.value)} />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="info-box info-primary" style={{ marginTop: '2rem' }}>
                                        <div className="info-box-icon"><Shield size={20} className="text-primary-600" /></div>
                                        <div className="info-box-content">
                                            <h4>Säker signering</h4>
                                            <p>Parternas identitet verifieras automatiskt med <strong>BankID</strong> vid signeringstillfället.</p>
                                        </div>
                                    </div>

                                    {formData.contractType === 'tourist' && (
                                        <label>
                                            Max antal gäster
                                            <input type="number" placeholder="T.ex. 4" value={formData.maxGuests} onChange={e => updateForm('maxGuests', e.target.value)} style={{ width: '120px' }} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h2 className="card-title">Ekonomi och Datum</h2>

                                    <div className="form-row">
                                        <label>
                                            {formData.contractType === 'tourist' ? 'Totalpris' : 'Månadshyra'} *
                                            <div className="relative w-full">
                                                <input type="number" placeholder="0" value={formData.rentAmount} onChange={e => updateForm('rentAmount', e.target.value)} className="input-currency w-full" />
                                                <div className="currency-suffix" style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', position: 'absolute', pointerEvents: 'none' }}>EUR</div>
                                            </div>
                                        </label>
                                        <label>
                                            Deposition *
                                            <div className="relative w-full">
                                                <input type="number" placeholder="0" value={formData.depositAmount} onChange={e => updateForm('depositAmount', e.target.value)} className="input-currency w-full" />
                                                <div className="currency-suffix" style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', position: 'absolute', pointerEvents: 'none' }}>EUR</div>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="info-box info-primary" style={{ marginTop: '2rem' }}>
                                        <div className="info-box-icon"><CreditCard size={20} className="text-primary-600" /></div>
                                        <div className="info-box-content">
                                            <h4>Trygg betalning via Escrow</h4>
                                            <p>Hyran hålls på ett säkert klientmedelskonto och betalas ut till hyresvärden först när hyresgästen har checkat in och godkänt bostaden.</p>
                                        </div>
                                    </div>

                                    {(formData.contractType === 'tourist' || formData.contractType === 'seasonal') && (
                                        <div className="info-box info-warning flex-col items-stretch">
                                            <div className="flex items-center gap-2 font-semibold text-sm border-b border-orange-200/50 pb-2 mb-2">
                                                <Calendar size={16} /> Bokningsregler
                                            </div>

                                            <div className="contract-form">
                                                <label className="text-inherit">
                                                    Förhandsbetalning
                                                    <input type="number" placeholder="Belopp i EUR" value={formData.prepaymentAmount} onChange={e => updateForm('prepaymentAmount', e.target.value)} />
                                                </label>

                                                {formData.prepaymentAmount && (
                                                    <div className="form-row">
                                                        <label className="text-inherit">
                                                            Återbetalning
                                                            <div className="creator-side-options">
                                                                <label className="radio-option flex-1 justify-center">
                                                                    <input type="radio" checked={formData.prepaymentNonRefundable} onChange={() => updateForm('prepaymentNonRefundable', true)} />
                                                                    <span>Ej återbetalningsbar</span>
                                                                </label>
                                                                <label className="radio-option flex-1 justify-center">
                                                                    <input type="radio" checked={!formData.prepaymentNonRefundable} onChange={() => updateForm('prepaymentNonRefundable', false)} />
                                                                    <span>Återbetalningsbar</span>
                                                                </label>
                                                            </div>
                                                        </label>
                                                        <label className="text-inherit">
                                                            Sista avbokningsdag
                                                            <input type="date" value={formData.cancellationDeadline} onChange={e => updateForm('cancellationDeadline', e.target.value)} />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-2">
                                        <h3 className="font-semibold text-gray-900 text-sm pb-2">Avtalsperiod</h3>
                                        <div className="form-row">
                                            <label>
                                                Startdatum *
                                                <input type="date" value={formData.startDate} onChange={e => updateForm('startDate', e.target.value)} />
                                            </label>
                                            <label>
                                                Slutdatum
                                                <input type="date" value={formData.endDate} onChange={e => updateForm('endDate', e.target.value)} />
                                            </label>
                                        </div>
                                    </div>

                                    {formData.contractType === 'tourist' && (
                                        <div className="form-row">
                                            <label>
                                                Check-in tid
                                                <input type="time" value={formData.checkIn} onChange={e => updateForm('checkIn', e.target.value)} />
                                            </label>
                                            <label>
                                                Check-out tid
                                                <input type="time" value={formData.checkOut} onChange={e => updateForm('checkOut', e.target.value)} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h2 className="card-title">Villkor och Regler</h2>

                                    <div>
                                        <label className="text-sm font-semibold text-gray-500 mb-4 block">Vad ingår i hyran?</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {utilities.map(u => (
                                                <button key={u.id} onClick={() => toggleArrayItem('utilitiesIncluded', u.id)} className={`selection-chip py-3 ${formData.utilitiesIncluded.includes(u.id) ? 'selected' : ''}`}>
                                                    <span className="selection-chip-icon">
                                                        {formData.utilitiesIncluded.includes(u.id) ? <Check size={16} /> : null}
                                                    </span>
                                                    {u.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row flex-col sm:flex-row gap-6">
                                        <label className="flex-1">
                                            Tillåts husdjur?
                                            <div className="creator-side-options gap-4 mt-3">
                                                {['yes', 'no'].map(opt => (
                                                    <label key={opt} className="radio-option flex-1 justify-center py-3">
                                                        <input type="radio" checked={formData.pets === opt} onChange={() => updateForm('pets', opt)} />
                                                        <span>{opt === 'yes' ? 'Ja' : 'Nej'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </label>
                                        {formData.contractType !== 'tourist' && (
                                            <label className="flex-1">
                                                Andrahandsuthyrning?
                                                <div className="creator-side-options gap-4 mt-3">
                                                    {['yes', 'no'].map(opt => (
                                                        <label key={opt} className="radio-option flex-1 justify-center py-3">
                                                            <input type="radio" checked={formData.subletting === opt} onChange={() => updateForm('subletting', opt)} />
                                                            <span>{opt === 'yes' ? 'Ja' : 'Nej'}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </label>
                                        )}
                                    </div>

                                    {formData.contractType === 'tourist' && (
                                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                            <label className="block text-sm font-medium text-gray-900 mb-4">Husregler</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {houseRuleOptions.map(rule => (
                                                    <button key={rule.id} onClick={() => toggleArrayItem('houseRules', rule.id)} className={`selection-chip py-3 ${formData.houseRules.includes(rule.id) ? 'selected' : ''}`}>
                                                        <span className="selection-chip-icon">
                                                            {formData.houseRules.includes(rule.id) ? <Check size={14} /> : null}
                                                        </span>
                                                        {rule.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {formData.contractType !== 'tourist' && (
                                        <label>
                                            Uppsägningstid
                                            <select value={formData.noticePeriod} onChange={e => updateForm('noticePeriod', e.target.value)} className="mt-2">
                                                <option value="30">30 dagar</option>
                                                <option value="60">60 dagar</option>
                                                <option value="90">90 dagar</option>
                                            </select>
                                        </label>
                                    )}

                                    <label>
                                        Övriga villkor
                                        <textarea placeholder="Lägg till eventuella specialvillkor här..." value={formData.terms} onChange={e => updateForm('terms', e.target.value)} rows={3} className="mt-2" />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="contract-actions mt-12 pt-6 w-full justify-between items-center" style={{ marginTop: '4rem' }}>
                            {step > 0 ? (
                                <button onClick={() => setStep(s => s - 1)} className="btn btn-secondary">
                                    <ChevronLeft size={18} /> Tillbaka
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {step < 4 ? (
                                <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className={`btn ${canProceed() ? 'btn-primary' : 'btn-secondary opacity-50'}`}>
                                    Fortsätt <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button onClick={() => setShowPreview(true)} className="btn btn-primary">
                                    <Eye size={18} /> Förhandsgranska
                                </button>
                            )}
                        </div>

                        {step === 4 && <p className="text-xs text-gray-400 text-center mt-6 font-medium">Uppfyller kraven i spansk lagstiftning (LAU/turistlagen)</p>}
                    </div>

                    {showPreview && <ContractPreview />}
                </div>
            </div>
        </Layout>
    );
}
