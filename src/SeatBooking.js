import React, { useEffect, useState } from 'react';
import './SeatBooking.css';

const SEAT_STATUS = {
    AVAILABLE: 'available',
    SELECTED: 'selected',
    BOOKED: 'booked'
};

const SEAT_PRICES = {
    PREMIUM: 1000,  // Rows A-C (0-2)
    STANDARD: 750,  // Rows D-F (3-5)
    ECONOMY: 500    // Rows G-H (6-7)
};

const MAX_SEATS_PER_BOOKING = 8;
const ROWS = 8;
const SEATS_PER_ROW = 10;

const initializeSeats = () => {
    const seats = [];
    for (let row = 0; row < ROWS; row++) {
        const rowSeats = [];
        for (let seat = 0; seat < SEATS_PER_ROW; seat++) {
            rowSeats.push({
                id: `${row}-${seat}`,
                row: row,
                seat: seat,
                status: SEAT_STATUS.AVAILABLE
            });
        }
        seats.push(rowSeats);
    }
    return seats;
};

const CategoryLegend = () => (
    <div className="category-info-bar">
        <div className="category-card">
            <div className="category-color-dot dot-premium"></div>
            <div className="category-details">
                <span className="category-name">Premium</span>
                <span className="category-price">₹{SEAT_PRICES.PREMIUM}</span>
            </div>
        </div>
        <div className="category-card">
            <div className="category-color-dot dot-standard"></div>
            <div className="category-details">
                <span className="category-name">Standard</span>
                <span className="category-price">₹{SEAT_PRICES.STANDARD}</span>
            </div>
        </div>
        <div className="category-card">
            <div className="category-color-dot dot-economy"></div>
            <div className="category-details">
                <span className="category-name">Economy</span>
                <span className="category-price">₹{SEAT_PRICES.ECONOMY}</span>
            </div>
        </div>
    </div>
);

const BookingModal = ({ isOpen, summary, onConfirm, onCancel }) => {
    if (!isOpen || !summary) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Confirm Your Booking</h3>
                    <button className="modal-close" onClick={onCancel} aria-label="Close confirmation dialog">
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <p>You are about to book <strong>{summary.count}</strong> seat(s).</p>
                    <p>Total payable amount:</p>
                    <div className="modal-total">₹{summary.total.toLocaleString('en-IN')}</div>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={onConfirm}>
                        Confirm Booking
                    </button>
                </div>
            </div>
        </div>
    );
};

const SeatBooking = () => {
    const [seats, setSeats] = useState(() => initializeSeats());
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingSummary, setPendingSummary] = useState(null);
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const getSeatPrice = (row) => {
        if (row <= 2) return SEAT_PRICES.PREMIUM;
        if (row <= 5) return SEAT_PRICES.STANDARD;
        return SEAT_PRICES.ECONOMY;
    };

    const countSeatsByStatus = (seatLayout, status) =>
        seatLayout.reduce((acc, row) => acc + row.filter((seat) => seat.status === status).length, 0);

    const getSelectedCount = () => countSeatsByStatus(seats, SEAT_STATUS.SELECTED);
    const getBookedCount = () => countSeatsByStatus(seats, SEAT_STATUS.BOOKED);
    const getAvailableCount = () => countSeatsByStatus(seats, SEAT_STATUS.AVAILABLE);

    const getTierInfo = (row) => {
        if (row <= 2) return { label: 'Premium', type: 'premium', price: SEAT_PRICES.PREMIUM };
        if (row <= 5) return { label: 'Standard', type: 'standard', price: SEAT_PRICES.STANDARD };
        return { label: 'Economy', type: 'economy', price: SEAT_PRICES.ECONOMY };
    };

    const calculateTotalPrice = () => {
        return seats.reduce(
            (total, row, rowIndex) =>
                total +
                row.reduce(
                    (rowTotal, seat) =>
                        seat.status === SEAT_STATUS.SELECTED ? rowTotal + getSeatPrice(rowIndex) : rowTotal,
                    0
                ),
            0
        );
    };

    const cloneSeats = (seatLayout) =>
        seatLayout.map((row) => row.map((seat) => ({ ...seat })));

    const validateContinuity = (seatLayout = seats) => {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 1; col < SEATS_PER_ROW - 1; col++) {
                const current = seatLayout[row][col];
                if (current.status !== SEAT_STATUS.AVAILABLE) continue;

                const leftTaken = seatLayout[row][col - 1].status !== SEAT_STATUS.AVAILABLE;
                const rightTaken = seatLayout[row][col + 1].status !== SEAT_STATUS.AVAILABLE;

                if (leftTaken && rightTaken) {
                    return false;
                }
            }
        }
        return true;
    };

    const persistBookedSeats = (seatLayout) => {
        if (typeof window === 'undefined') return;
        const bookedSeatIds = [];
        seatLayout.forEach((row) =>
            row.forEach((seat) => {
                if (seat.status === SEAT_STATUS.BOOKED) {
                    bookedSeatIds.push(seat.id);
                }
            })
        );
        window.localStorage.setItem('bookedSeats', JSON.stringify(bookedSeatIds));
    };

    const loadPersistedBookings = () => {
        if (typeof window === 'undefined') return;
        const storedValue = window.localStorage.getItem('bookedSeats');
        if (!storedValue) return;

        try {
            const parsed = JSON.parse(storedValue);
            if (!Array.isArray(parsed) || parsed.length === 0) return;

            const bookedSet = new Set(parsed);
            setSeats((prevSeats) =>
                prevSeats.map((row) =>
                    row.map((seat) =>
                        bookedSet.has(seat.id) ? { ...seat, status: SEAT_STATUS.BOOKED } : seat
                    )
                )
            );
        } catch (_error) {
            window.localStorage.removeItem('bookedSeats');
        }
    };

    useEffect(() => {
        loadPersistedBookings();
    }, []);

    const handleSeatClick = (row, seat) => {
        setStatusMessage('');
        setErrorMessage('');

        const targetSeat = seats[row][seat];
        if (targetSeat.status === SEAT_STATUS.BOOKED) {
            return;
        }

        const updatedSeats = cloneSeats(seats);
        const updatedSeat = updatedSeats[row][seat];

        if (updatedSeat.status === SEAT_STATUS.SELECTED) {
            updatedSeat.status = SEAT_STATUS.AVAILABLE;
            setSeats(updatedSeats);
            return;
        }

        if (getSelectedCount() >= MAX_SEATS_PER_BOOKING) {
            setErrorMessage(`You can select up to ${MAX_SEATS_PER_BOOKING} seats per booking.`);
            return;
        }

        updatedSeat.status = SEAT_STATUS.SELECTED;

        if (!validateContinuity(updatedSeats)) {
            setErrorMessage('Selection cannot isolate a single available seat between taken seats.');
            return;
        }

        setSeats(updatedSeats);
    };

    const handleBooking = () => {
        setStatusMessage('');
        setErrorMessage('');

        const selectedCount = getSelectedCount();
        if (selectedCount === 0) return;

        if (selectedCount > MAX_SEATS_PER_BOOKING) {
            setErrorMessage(`You can select a maximum of ${MAX_SEATS_PER_BOOKING} seats.`);
            return;
        }

        if (!validateContinuity()) {
            setErrorMessage('Selection cannot isolate a single available seat between taken seats.');
            return;
        }

        const totalPrice = calculateTotalPrice();
        setPendingSummary({
            count: selectedCount,
            total: totalPrice
        });
        setShowConfirmation(true);
    };

    const removeSeat = (row, seat) => {
        setStatusMessage('');
        setErrorMessage('');

        const updatedSeats = cloneSeats(seats);
        const updatedSeat = updatedSeats[row][seat];

        if (updatedSeat.status === SEAT_STATUS.SELECTED) {
            updatedSeat.status = SEAT_STATUS.AVAILABLE;
            setSeats(updatedSeats);
        }
    };

    const clearSelection = () => {
        if (getSelectedCount() === 0) return;

        setStatusMessage('');
        setErrorMessage('');
        setShowConfirmation(false);
        setPendingSummary(null);

        const clearedSeats = seats.map((row) =>
            row.map((seat) =>
                seat.status === SEAT_STATUS.SELECTED
                    ? { ...seat, status: SEAT_STATUS.AVAILABLE }
                    : seat
            )
        );

        setSeats(clearedSeats);
    };

    const resetSystem = () => {
        setStatusMessage('');
        setErrorMessage('');
        setShowConfirmation(false);
        setPendingSummary(null);
        setSeats(initializeSeats());

        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('bookedSeats');
        }
    };

    const finalizeBooking = () => {
        if (!pendingSummary) return;

        const updatedSeats = seats.map((row) =>
            row.map((seat) =>
                seat.status === SEAT_STATUS.SELECTED
                    ? { ...seat, status: SEAT_STATUS.BOOKED }
                    : { ...seat }
            )
        );

        setSeats(updatedSeats);
        persistBookedSeats(updatedSeats);
        setStatusMessage(`Successfully booked ${pendingSummary.count} seat(s) for ₹${pendingSummary.total}.`);
        setPendingSummary(null);
        setShowConfirmation(false);
    };

    const closeModal = () => {
        setShowConfirmation(false);
        setPendingSummary(null);
    };

    return (
        <div className="seat-booking-app">
            <div className="bg-accent accent-one"></div>
            <div className="bg-accent accent-two"></div>
            <div className="bg-accent accent-three"></div>
            <div className="seat-booking-container">
                <header className="app-header">
                    <div className="header-top-row">
                        <p className="eyebrow">GreenStitch</p>
                        <button
                            className="theme-toggle-btn"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                    <div>
                        <h1>Seat Booking Experience</h1>
                        <p className="subtitle">Select seats, review pricing, and confirm your booking in seconds.</p>
                    </div>
                    <div className="status-bar">
                        <div className="status-card">
                            <span className="status-label">Available</span>
                            <span className="status-value">{getAvailableCount()}</span>
                        </div>
                        <div className="status-card">
                            <span className="status-label">Selected</span>
                            <span className="status-value accent">{getSelectedCount()}</span>
                        </div>
                        <div className="status-card">
                            <span className="status-label">Booked</span>
                            <span className="status-value">{getBookedCount()}</span>
                        </div>
                        <div className="status-card total-card">
                            <span className="status-label">Total</span>
                            <span className="status-value">₹{calculateTotalPrice()}</span>
                        </div>
                    </div>
                </header>

                <div className="main-layout">
                    <section className="panel-card seat-panel">
                        <div className="panel-header">
                            <div>
                                <h2>Seat Map</h2>
                                <p>Tap seats to select or deselect. Booked seats are unavailable.</p>
                            </div>
                            <div className="legend">
                                <div className="legend-item">
                                    <div className="seat-demo available"></div>
                                    <span>Available</span>
                                </div>
                                <div className="legend-item">
                                    <div className="seat-demo selected"></div>
                                    <span>Selected</span>
                                </div>
                                <div className="legend-item">
                                    <div className="seat-demo booked"></div>
                                    <span>Booked</span>
                                </div>
                            </div>
                        </div>

                        <CategoryLegend />

                        <div className="seat-grid">
                            {seats.map((row, rowIndex) => (
                                <div key={rowIndex} className="seat-row">
                                    <div className="row-label-group">
                                        <div className="row-label">{String.fromCharCode(65 + rowIndex)}</div>
                                        <span className={`tier-chip ${getTierInfo(rowIndex).type}`}>
                                            {getTierInfo(rowIndex).label}
                                        </span>
                                    </div>
                                    {row.map((seat, seatIndex) => (
                                        <div
                                            key={seat.id}
                                            className={`seat ${seat.status}`}
                                            onClick={() => handleSeatClick(rowIndex, seatIndex)}
                                        >
                                            {seatIndex + 1}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <CategoryLegend />
                    </section>

                    <aside className="panel-card summary-panel">
                        <h2>Booking Summary</h2>
                        <p className="price-note">Premium (A-C): ₹1000 · Standard (D-F): ₹750 · Economy (G-H): ₹500</p>

                        {errorMessage && (
                            <div className="message-banner error">
                                {errorMessage}
                            </div>
                        )}

                        {statusMessage && (
                            <div className="message-banner success">
                                {statusMessage}
                            </div>
                        )}

                        <div className="summary-grid">
                            <div>
                                <span className="summary-label">Selected seats</span>
                                <strong className="summary-value">{getSelectedCount()}</strong>
                            </div>
                            <div>
                                <span className="summary-label">Total payable</span>
                                <strong className="summary-value">₹{calculateTotalPrice()}</strong>
                            </div>
                        </div>

                        {getSelectedCount() > 0 && (
                            <div className="selected-seats-list">
                                <span className="summary-label">Selected Seats Details</span>
                                <div className="seats-tags">
                                    {seats.map((row, rowIndex) =>
                                        row.map((seat, seatIndex) => {
                                            if (seat.status === SEAT_STATUS.SELECTED) {
                                                return (
                                                    <div key={seat.id} className="seat-tag">
                                                        <span>{String.fromCharCode(65 + rowIndex)}-{seatIndex + 1}</span>
                                                        <button
                                                            className="remove-seat-btn"
                                                            onClick={() => removeSeat(rowIndex, seatIndex)}
                                                            aria-label={`Remove seat ${String.fromCharCode(65 + rowIndex)}-{seatIndex + 1}`}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="control-panel">
                            <button
                                className="btn btn-primary"
                                onClick={handleBooking}
                                disabled={getSelectedCount() === 0}
                            >
                                Book Selected Seats ({getSelectedCount()})
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={clearSelection}
                                disabled={getSelectedCount() === 0}
                            >
                                Clear Selection
                            </button>
                            <button
                                className="btn btn-tertiary"
                                onClick={resetSystem}
                            >
                                Reset All
                            </button>
                        </div>
                    </aside>
                </div>
            </div>

            <BookingModal
                isOpen={showConfirmation}
                summary={pendingSummary}
                onConfirm={finalizeBooking}
                onCancel={closeModal}
            />
        </div>
    );
};

export default SeatBooking;
