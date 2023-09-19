import { useMemo, useState } from "react";
import { calculatePMT } from "./formulas";
import "./App.css";

function isStringNumber(value: string): boolean {
	return value.trim() !== "" && !isNaN(Number(value));
}

function numberOrDefault(value: string, defaultValue: number): number {
	return isStringNumber(value) ? Number(value) : defaultValue;
}

function assertNumber(value: string): number {
	if (!isStringNumber(value)) {
		console.assert(false, `"${value}" is not a number`);
	}
	return Number(value);
}

function maxAmortization(purchasePrice: number, downPayment: number): number {
	return downPayment / purchasePrice < 0.2 ? 25 : 35;
}

function useDownPaymentAndAmoritzation() {
	const [purchasePrice, setPurchasePrice] = useState<string>("");
	const [downPayment, setDownPayment] = useState<string>("");
	const [amortization, setAmortization] = useState<number>(25);

	return [
		{ purchasePrice, downPayment, amortization } as const,
		{
			setPurchasePrice: (amount: string) => {
				setPurchasePrice(amount);
				setAmortization(
					Math.min(
						amortization,
						maxAmortization(
							numberOrDefault(amount, 0),
							numberOrDefault(downPayment, 0)
						)
					)
				);
			},
			setDownPayment: (amount: string) => {
				setDownPayment(amount);
				setAmortization(
					Math.min(
						amortization,
						maxAmortization(
							numberOrDefault(amount, 0),
							numberOrDefault(downPayment, 0)
						)
					)
				);
			},
			setAmortization: (amount: number) => {
				setAmortization(
					Math.min(
						amount,
						maxAmortization(
							numberOrDefault(purchasePrice, 0),
							numberOrDefault(downPayment, 0)
						)
					)
				);
			},
		} as const,
	] as const;
}

type Bracketing = {
	amount: number;
	factor: number;
};

type UpfrontCosts =
	| {
			type: "DOWN_PAYMENT";
			total: number;
	  }
	| {
			type: "PROPERTY_TRANSFER_TAX";
			total: number;
			breakdown: Bracketing[];
	  };

function never(_: never): void {}

function costTypeMapping(type: UpfrontCosts["type"]): string {
	switch (type) {
		case "DOWN_PAYMENT":
			return "Down Payment";
		case "PROPERTY_TRANSFER_TAX":
			return "Property Transfer Tax";
	}

	never(type);
}

function calculateBracketedTax(
	price: number,
	bracketing: Bracketing[]
): number {
	let totalBracket = 0;
	let total = 0;
	for (let i = 0; i < bracketing.length; i++) {
		if (price < totalBracket) {
			break;
		}
		total += Math.min(price, bracketing[i].amount) * bracketing[i].factor;
		totalBracket += bracketing[i].amount;
	}
	return total;
}

type Details = {
	gst: string;
	price: string;
	propertyType: "STRATA" | "LAND";
	isNewConstruction: boolean;
	downPayment: string;
	bracketing: Bracketing[];
};

function getUpfrontCosts({
	price,
	// propertyType,
	downPayment,
	bracketing,
}: Details): UpfrontCosts[] {
	let result: UpfrontCosts[] = [];

	if (isStringNumber(downPayment)) {
		result.push({
			type: "DOWN_PAYMENT",
			total: assertNumber(downPayment),
		});
	}

	if (isStringNumber(price)) {
		const tax = calculateBracketedTax(assertNumber(price), bracketing);
		result.push({
			type: "PROPERTY_TRANSFER_TAX",
			total: tax,
			breakdown: bracketing,
		});
	}

	return result;
}

function App() {
	const [
		{ purchasePrice, downPayment, amortization },
		{ setPurchasePrice, setDownPayment, setAmortization },
	] = useDownPaymentAndAmoritzation();
	const [isNewConstruction, setIsNewConstruction] = useState<boolean>(false);
	const principal = useMemo<number | undefined>(() => {
		if (!isStringNumber(purchasePrice) || !isStringNumber(downPayment)) {
			return undefined;
		}
		return (
			assertNumber(purchasePrice) * (isNewConstruction ? 1 + 0.05 : 0) -
			assertNumber(downPayment)
		);
	}, [purchasePrice, downPayment, isNewConstruction]);

	const costs = getUpfrontCosts({
		gst: "0.05",
		price: purchasePrice,
		propertyType: "LAND",
		isNewConstruction,
		downPayment,
		bracketing: [
			{
				amount: 200_000,
				factor: 0.01,
			},
			{
				amount: 2_000_000 - 200_000,
				factor: 0.02,
			},
			{
				amount: Number.POSITIVE_INFINITY,
				factor: 0.03,
			},
		],
	});

	return (
		<>
			<div>
				<div>
					Purchase Price{" "}
					<input
						type="text"
						value={purchasePrice}
						onChange={(e) => {
							setPurchasePrice(e.target.value);
						}}
					/>
				</div>
				{!isStringNumber(purchasePrice) ? <p>Not a number</p> : null}

				<div>
					Downpayment{" "}
					<input
						type="text"
						value={downPayment}
						onChange={(e) => {
							setDownPayment(e.target.value);
						}}
					/>
				</div>
				<div>
					<p>
						1{" "}
						<input
							type="range"
							value={amortization}
							min="1"
							max={maxAmortization(
								numberOrDefault(purchasePrice, 0),
								numberOrDefault(downPayment, 0)
							)}
							onChange={(e) => {
								setAmortization(Number(e.target.value));
							}}
						/>{" "}
						{maxAmortization(
							numberOrDefault(purchasePrice, 0),
							numberOrDefault(downPayment, 0)
						)}
					</p>
					<p>{amortization} years</p>
					<p>
						<input
							type="checkbox"
							checked={isNewConstruction}
							onChange={() => {
								setIsNewConstruction(!isNewConstruction);
							}}
						/>{" "}
						Is new construction?
					</p>
				</div>
				{purchasePrice.trim() !== "" && isStringNumber(purchasePrice) ? (
					<div>
						<p>
							Principal:
							{isStringNumber(downPayment)
								? " $" +
								  numberOrDefault(purchasePrice, 0).toLocaleString() +
								  " - $" +
								  numberOrDefault(downPayment, 0).toLocaleString() +
								  " = "
								: null}{" "}
							${principal?.toLocaleString()}
						</p>
						<p>Upfront Cost</p>
						<ul>
							{costs.map(({ type, total }) => (
								<li key={type}>
									{costTypeMapping(type)}: ${total.toLocaleString()}
								</li>
							))}
						</ul>
						<p>
							Total: $
							{costs
								.reduce((prev, next) => prev + next.total, 0)
								.toLocaleString()}
						</p>
					</div>
				) : null}
			</div>
		</>
	);
}

export default App;
