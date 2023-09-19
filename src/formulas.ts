export function calculatePMT(
	rate: number,
	nper: number,
	pv: number,
	fv: number = 0
): number {
	// Calculate the denominator part of the formula
	const denominator = Math.pow(1 + rate, nper) - 1;

	// Calculate the numerator part of the formula
	const numerator = rate * (pv * Math.pow(1 + rate, nper) + fv);

	// Calculate the payment
	const pmt = numerator / denominator;

	return -pmt; // Convert to a positive value (Excel returns a negative value)
}

const firstBracket = 200_000;
const secondBracket = 2_000_000;

export function calculatePTT(price: number): number {
	let total = Math.min(firstBracket, price) * 0.01;
	if (price > firstBracket) {
		total +=
			Math.min(secondBracket - firstBracket, price - firstBracket) * 0.02;
	}
	if (price > secondBracket) {
		total += (price - secondBracket) * 0.03;
	}

	return total;
}

type LoanValue = {
	loan: number;
	value: number;
};

export function calculateLTV({ loan, value }: LoanValue): number {
	return loan / value;
}

const legalFees = 1300;
const propertyAppraisal = 300;
const propertySurvey = 500;
const maxMoveInFee = 500;
const maxHomeInspection = 450;

type Range = {
	min: number;
	max: number;
};

type Details = {
	gst: number;
	price: number;
	propertyType: "STRATA" | "LAND";
	ownershipType: "NEW-CONSTRUCTION" | "RESALE";
	downPayment:
		| {
				type: "PERCENTAGE";
				value: number;
		  }
		| {
				type: "AMOUNT";
				value: number;
		  };
};

export function calculateUpfrontCost({
	gst,
	price,
	propertyType,
	ownershipType,
	downPayment,
}: Details): Range {
	let total = {
		min: calculatePTT(price) + legalFees + propertyAppraisal,
		max:
			calculatePTT(price) + legalFees + propertyAppraisal + maxHomeInspection,
	};
	switch (propertyType) {
		case "LAND":
			total.max += propertySurvey * gst;
			break;
		case "STRATA":
			total.max += maxMoveInFee;
			break;
	}
	switch (ownershipType) {
		case "NEW-CONSTRUCTION":
			total.min += price * (1 + gst);
			total.max += price * (1 + gst);
			break;
		case "RESALE":
			break;
	}
	const downPaymentAmount =
		downPayment.type === "AMOUNT"
			? downPayment.value
			: price * downPayment.value;
	return {
		min: total.min + downPaymentAmount,
		max: total.max + downPaymentAmount,
	};
}
